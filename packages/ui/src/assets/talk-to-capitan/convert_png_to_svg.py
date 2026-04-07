#!/usr/bin/env python3
"""
Convert talk-to-capitan PNG exports to SVG.

- background-*.png: if visually solid (tight RGB range on a downsample), emit a single
  <rect> vector (no megapixel trace).
- Other PNGs: raster trace via potrace (brew install potrace) after flattening RGBA on
  white and 1-bit threshold; trace resolution capped for speed, viewBox maps to original
  pixel dimensions.
- Files named like ``ChatGPT Image *.png`` are exported as **self-contained SVG** with
  the PNG **base64-embedded** in a data URI (large files). Raster photos do not trace
  cleanly with potrace when contrast is low (e.g. dark-on-dark).

Requires: Pillow, potrace on PATH.
"""
from __future__ import annotations

import base64
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

DIR = Path(__file__).resolve().parent
MAX_TRACE_EDGE = 4096
BACKGROUND_NAME = "background-Talk-to-Capitan.png"
# Brand green from asset / PPTX slide bg (#0C3A1C)
FALLBACK_BG_HEX = "#0C3A1C"


def potrace_bin() -> str:
    p = shutil.which("potrace")
    if not p:
        raise SystemExit("potrace not found. Install: brew install potrace")
    return p


def is_solid_background(path: Path) -> tuple[bool, str]:
    im = Image.open(path).convert("RGB")
    sm = im.resize((256, 256), Image.Resampling.BILINEAR)
    ext = [sm.getextrema()[i] for i in range(3)]
    spans = [ext[i][1] - ext[i][0] for i in range(3)]
    if max(spans) <= 18:
        px = sm.getpixel((128, 128))
        hx = "#{:02x}{:02x}{:02x}".format(*px)
        return True, hx
    return False, FALLBACK_BG_HEX


def png_to_embedded_raster_svg(src: Path, dst: Path) -> None:
    """SVG with PNG pixels inlined as data:image/png;base64,… (no external file)."""
    im = Image.open(src)
    w, h = im.size
    raw = src.read_bytes()
    b64 = base64.standard_b64encode(raw).decode("ascii")
    data_uri = f"data:image/png;base64,{b64}"
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <image width="{w}" height="{h}" xlink:href="{data_uri}" href="{data_uri}" preserveAspectRatio="xMidYMid meet"/>
</svg>
'''
    dst.write_text(svg, encoding="utf-8")


def write_solid_background_svg(out: Path, w: int, h: int, fill: str) -> None:
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <rect width="100%" height="100%" fill="{fill}"/>
</svg>
'''
    out.write_text(svg, encoding="utf-8")


def png_to_potrace_svg(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    orig_w, orig_h = im.size
    bg = Image.new("RGB", (orig_w, orig_h), (255, 255, 255))
    bg.paste(im, mask=im.split()[3])

    scale = min(1.0, MAX_TRACE_EDGE / max(orig_w, orig_h))
    tw = max(1, int(round(orig_w * scale)))
    th = max(1, int(round(orig_h * scale)))
    sm = bg.resize((tw, th), Image.Resampling.LANCZOS).convert("L")
    # Gold type on transparent, flattened on white.
    bw = sm.point(lambda x: 0 if x < 252 else 255, mode="1")
    turd, opt = "8", "0.35"

    with tempfile.NamedTemporaryFile(suffix=".pbm", delete=False) as tmp:
        pbm = Path(tmp.name)
    try:
        bw.save(pbm)
        subprocess.run(
            [
                potrace_bin(),
                "-s",
                "-o",
                str(dst),
                "--turd",
                turd,
                "--opttolerance",
                opt,
                str(pbm),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    finally:
        pbm.unlink(missing_ok=True)

    text = dst.read_text(encoding="utf-8")
    # Map traced pixel space to original asset dimensions.
    def repl_svg_open(m: re.Match[str]) -> str:
        return (
            f'<svg version="1.0" xmlns="http://www.w3.org/2000/svg"\n'
            f' width="{orig_w}" height="{orig_h}" viewBox="0 0 {tw} {th}"\n'
            f' preserveAspectRatio="xMidYMid meet">'
        )

    text_new = re.sub(r"<svg\b[\s\S]*?>", repl_svg_open, text, count=1)
    # Drop old DOCTYPE for smaller / friendlier files.
    text_new = re.sub(r"<!DOCTYPE[^>]+>\s*", "", text_new, count=1)
    text_new = text_new.replace('fill="#000000"', 'fill="#FFCA55"')
    dst.write_text(text_new, encoding="utf-8")


def main() -> None:
    potrace_bin()
    for png in sorted(DIR.glob("*.png")):
        out = png.with_suffix(".svg")
        if png.name == BACKGROUND_NAME:
            solid, fill = is_solid_background(png)
            im = Image.open(png)
            w, h = im.size
            if solid:
                write_solid_background_svg(out, w, h, fill)
                print(f"{png.name} -> {out.name} (solid fill {fill})")
            else:
                png_to_potrace_svg(png, out)
                print(f"{png.name} -> {out.name} (potrace; non-solid background)")
        else:
            if png.name.startswith("ChatGPT Image"):
                png_to_embedded_raster_svg(png, out)
                sz_mb = out.stat().st_size / (1024 * 1024)
                print(f"{png.name} -> {out.name} (embedded PNG, {sz_mb:.1f} MB)")
            else:
                png_to_potrace_svg(png, out)
                print(f"{png.name} -> {out.name} (potrace)")


if __name__ == "__main__":
    main()
