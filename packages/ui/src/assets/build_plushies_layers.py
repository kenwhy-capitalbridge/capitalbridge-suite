#!/usr/bin/env python3
"""
Build print PDFs with real Optional Content Groups (layers) from the final artwork PNG.

1) Talk to El-Capitan Plushies_layers.pdf / .ai
   - Composite PNG full-bleed (matches exported art).
   - Optional deck-green background OCG behind it.

2) Talk to El-Capitan Plushies_spotUV.pdf
   - Same page size as (1), white page, black = where gloss/Spot UV should hit.
   - Built from PPTX placements: image1.svg (lion mark), image2.svg (QR strip).
   - Optional: Talk to El-Capitan Plushies_spotUV_extra.png (full-artboard mask) for
     elements only in the composite (e.g. large bottom lockup). Black = UV, white = no UV.

Requires: python3 -m pip install pymupdf pillow
"""
from __future__ import annotations

import io
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import fitz

ASSETS = Path(__file__).resolve().parent
PPTX_PATH = ASSETS / "Talk to El-Capitan Plushies.pptx"
PNG_PATH = ASSETS / "Talk to El-Capitan Plushies.png"
OUT_PDF = ASSETS / "Talk to El-Capitan Plushies_layers.pdf"
OUT_AI = ASSETS / "Talk to El-Capitan Plushies_layers.ai"
OUT_SVG = ASSETS / "Talk to El-Capitan Plushies_layers.svg"
OUT_SPOT_UV = ASSETS / "Talk to El-Capitan Plushies_spotUV.pdf"
# Optional: same aspect as composite PNG (or slide); black = UV, white = none.
SPOT_UV_EXTRA = ASSETS / "Talk to El-Capitan Plushies_spotUV_extra.png"

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

EMU_PER_PT = 12700.0
SPOT_UV_RASTER_DPI = 400


def emu_to_pt(emu: int | float) -> float:
    return float(emu) / EMU_PER_PT


def srgb_to_fitz(hex6: str) -> tuple[float, float, float]:
    h = hex6.strip().lstrip("#")
    return int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0


def parse_slide_background(sld: ET.Element) -> tuple[float, float, float] | None:
    bg = sld.find(".//p:bg", NS)
    if bg is None:
        return None
    clr = bg.find(".//a:srgbClr", NS)
    if clr is None:
        return None
    val = clr.get("val")
    if not val:
        return None
    return srgb_to_fitz(val)


def load_slide_rels(z: zipfile.ZipFile) -> dict[str, str]:
    raw = z.read("ppt/slides/_rels/slide1.xml.rels")
    root = ET.fromstring(raw)
    out: dict[str, str] = {}
    for el in root:
        if el.tag.endswith("Relationship"):
            rid = el.get("Id")
            target = el.get("Target")
            if rid and target:
                out[rid] = target.replace("\\", "/")
    return out


def resolve_media_path(target: str) -> str:
    parts = target.split("/")
    if parts[0] == "..":
        return "ppt/" + "/".join(parts[1:])
    return target


def blip_embed_id(blip_el: ET.Element | None) -> str | None:
    if blip_el is None:
        return None
    r_embed = f"{{{NS['r']}}}embed"
    rid = blip_el.get(r_embed)
    if rid:
        return rid
    for el in blip_el.iter():
        rid = el.get(r_embed)
        if rid:
            return rid
    return None


def parse_pptx_slide_meta(z: zipfile.ZipFile) -> tuple[float, float, tuple[float, float, float] | None]:
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    sz = pres.find("p:sldSz", NS)
    if sz is None:
        raise ValueError("presentation.xml: missing p:sldSz")
    slide_w = emu_to_pt(int(sz.get("cx", 0)))
    slide_h = emu_to_pt(int(sz.get("cy", 0)))

    sld = ET.fromstring(z.read("ppt/slides/slide1.xml"))
    bg_color = parse_slide_background(sld)
    return slide_w, slide_h, bg_color


def parse_spot_uv_targets(z: zipfile.ZipFile) -> tuple[float, float, list[dict]]:
    """Picture slots that map to varnish art (lion SVG + QR SVG from deck)."""
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    sz = pres.find("p:sldSz", NS)
    if sz is None:
        raise ValueError("presentation.xml: missing p:sldSz")
    slide_w = emu_to_pt(int(sz.get("cx", 0)))
    slide_h = emu_to_pt(int(sz.get("cy", 0)))

    rels = load_slide_rels(z)
    sld = ET.fromstring(z.read("ppt/slides/slide1.xml"))
    sp_tree = sld.find(".//p:spTree", NS)
    if sp_tree is None:
        raise ValueError("slide1: missing spTree")

    targets: list[dict] = []
    for child in sp_tree:
        if child.tag.split("}")[-1] != "pic":
            continue
        xfrm = child.find(".//a:xfrm", NS)
        if xfrm is None:
            continue
        off = xfrm.find("a:off", NS)
        ext = xfrm.find("a:ext", NS)
        if off is None or ext is None:
            continue
        x, y = emu_to_pt(int(off.get("x", 0))), emu_to_pt(int(off.get("y", 0)))
        w, h = emu_to_pt(int(ext.get("cx", 0))), emu_to_pt(int(ext.get("cy", 0)))
        blip = child.find(".//a:blip", NS)
        rid = blip_embed_id(blip)
        if not rid or rid not in rels:
            continue
        media = resolve_media_path(rels[rid])
        base = Path(media).name.lower()
        if base == "image1.svg":
            label = "01 Lion mark (from image1.svg)"
        elif base == "image2.svg":
            label = "02 QR / upper lockup strip (from image2.svg)"
        else:
            continue
        targets.append({"label": label, "media_zip_path": media, "rect": (x, y, w, h)})

    return slide_w, slide_h, targets


def pixmap_to_uv_mask(pix: fitz.Pixmap, alpha_threshold: int = 128) -> fitz.Pixmap:
    """White = no UV; black = UV. Uses alpha from rasterized SVG (silhouette / full QR card)."""
    from PIL import Image

    bio = io.BytesIO(pix.tobytes("png"))
    im = Image.open(bio).convert("RGBA")
    w, h = im.size
    out = Image.new("RGB", (w, h), (255, 255, 255))
    src = im.load()
    dst = out.load()
    for yy in range(h):
        for xx in range(w):
            _r, _g, _b, a = src[xx, yy]
            if a >= alpha_threshold:
                dst[xx, yy] = (0, 0, 0)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    buf.seek(0)
    return fitz.Pixmap(buf.read())


def extra_png_to_uv_mask(path: Path) -> fitz.Pixmap:
    """
    Hand-authored mask: same pixel size as composite PNG recommended.
    - Transparent = no UV.
    - Black (or dark) opaque = UV.
    - White opaque = no UV (so you can paint only the large logo, etc.).
    """
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    out = Image.new("RGB", (w, h), (255, 255, 255))
    src = im.load()
    dst = out.load()
    for yy in range(h):
        for xx in range(w):
            r, g, b, a = src[xx, yy]
            if a < 128:
                continue
            if (r + g + b) / 3.0 < 200:
                dst[xx, yy] = (0, 0, 0)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    buf.seek(0)
    return fitz.Pixmap(buf.read())


def svg_to_uv_pixmap(svg_bytes: bytes, w_pt: float, h_pt: float) -> fitz.Pixmap:
    doc = fitz.open(stream=svg_bytes, filetype="svg")
    try:
        page = doc[0]
        pw = max(1, int(w_pt * SPOT_UV_RASTER_DPI / 72.0))
        ph = max(1, int(h_pt * SPOT_UV_RASTER_DPI / 72.0))
        sw, sh = page.rect.width, page.rect.height
        if sw <= 0 or sh <= 0:
            raise ValueError("SVG page has zero size")
        mat = fitz.Matrix(pw / sw, ph / sh)
        raw = page.get_pixmap(matrix=mat, alpha=True)
        return pixmap_to_uv_mask(raw)
    finally:
        doc.close()


def write_layered_pdf(slide_w: float, slide_h: float, bg_color: tuple[float, float, float] | None) -> None:
    if not PNG_PATH.is_file():
        raise FileNotFoundError(f"Missing composite PNG: {PNG_PATH}")

    doc = fitz.open()
    page = doc.new_page(width=slide_w, height=slide_h)
    full = fitz.Rect(0, 0, slide_w, slide_h)

    ocg_idx = 0

    if bg_color is not None:
        ocg_idx += 1
        ocg_bg = doc.add_ocg(f"{ocg_idx:02d} Background plate (deck green)", on=True)
        page.draw_rect(full, color=None, fill=bg_color, oc=ocg_bg)

    ocg_idx += 1
    ocg_art = doc.add_ocg(f"{ocg_idx:02d} Artwork (full composite PNG)", on=True)
    page.insert_image(full, filename=str(PNG_PATH), keep_proportion=False, oc=ocg_art)

    try:
        doc.subset_fonts()
    except Exception:
        pass
    doc.save(
        str(OUT_PDF),
        garbage=4,
        deflate=True,
        clean=True,
        pretty=False,
    )
    doc.close()

    OUT_AI.write_bytes(OUT_PDF.read_bytes())


def write_spot_uv_pdf(slide_w: float, slide_h: float, targets: list[dict], z: zipfile.ZipFile) -> None:
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None

    doc = fitz.open()
    page = doc.new_page(width=slide_w, height=slide_h)
    full = fitz.Rect(0, 0, slide_w, slide_h)
    page.draw_rect(full, color=None, fill=(1, 1, 1))

    ocg_idx = 0
    for t in targets:
        ocg_idx += 1
        ocg = doc.add_ocg(t["label"], on=True)
        x, y, w, h = t["rect"]
        rect = fitz.Rect(x, y, x + w, y + h)
        data = z.read(t["media_zip_path"])
        pix = svg_to_uv_pixmap(data, w, h)
        page.insert_image(rect, pixmap=pix, keep_proportion=False, oc=ocg)
        pix = None

    if SPOT_UV_EXTRA.is_file():
        ocg_idx += 1
        ocg = doc.add_ocg(f"{ocg_idx:02d} Extra mask (spotUV_extra.png — e.g. large lockup)", on=True)
        ex = extra_png_to_uv_mask(SPOT_UV_EXTRA)
        page.insert_image(full, pixmap=ex, keep_proportion=False, oc=ocg)

    doc.save(
        str(OUT_SPOT_UV),
        garbage=4,
        deflate=True,
        clean=True,
        pretty=False,
    )
    doc.close()


def write_simple_svg_link() -> None:
    if not PNG_PATH.is_file():
        return
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None
    with Image.open(PNG_PATH) as im:
        w, h = im.size
    png_name = PNG_PATH.name.replace("&", "&amp;").replace('"', "&quot;")
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  width="{w}px" height="{h}px" viewBox="0 0 {w} {h}">
  <g id="Layer_Artwork" data-name="Artwork (linked PNG)">
    <image width="{w}" height="{h}" xlink:href="{png_name}" href="{png_name}"/>
  </g>
</svg>
'''
    OUT_SVG.write_text(svg, encoding="utf-8")


def main() -> None:
    if not PPTX_PATH.is_file():
        raise SystemExit(f"Missing PPTX: {PPTX_PATH}")

    with zipfile.ZipFile(PPTX_PATH, "r") as z:
        slide_w, slide_h, bg = parse_pptx_slide_meta(z)
        uv_w, uv_h, uv_targets = parse_spot_uv_targets(z)
        if (uv_w, uv_h) != (slide_w, slide_h):
            raise SystemExit("Internal error: UV slide size mismatch")
        write_spot_uv_pdf(slide_w, slide_h, uv_targets, z)

    write_layered_pdf(slide_w, slide_h, bg)
    write_simple_svg_link()

    print(f"Wrote {OUT_PDF} (CMYK print — composite PNG)")
    print(f"Wrote {OUT_AI}")
    print(f"Wrote {OUT_SPOT_UV} (Spot UV mask: black = varnish; same trim as print PDF)")
    if not SPOT_UV_EXTRA.is_file():
        print(
            f"Optional: add {SPOT_UV_EXTRA.name} (black=UV, white=none, full bleed) "
            "if the large bottom logo also needs UV — it is not in the PPTX SVGs."
        )
    print(f"Wrote {OUT_SVG}")
    print("Acrobat layers: View > Show/Hide > Navigation Panes > Layers.")


if __name__ == "__main__":
    main()
