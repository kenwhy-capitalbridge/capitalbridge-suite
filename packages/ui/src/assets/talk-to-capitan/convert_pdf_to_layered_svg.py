#!/usr/bin/env python3
"""
Build a self-contained layered SVG from a single-page PDF by stacking embedded
rasters in paint order (PyMuPDF image list). Layers use inkscape:groupmode="layer"
for Inkscape; Illustrator may show them as groups.

Requires: python3 -m pip install pymupdf
"""
from __future__ import annotations

import base64
import sys
from pathlib import Path

import fitz

DIR = Path(__file__).resolve().parent
DEFAULT_PDF = DIR / "Talk to El-Capitan Plushies.pdf"
DEFAULT_OUT = DIR / "Talk to El-Capitan Plushies_layered.svg"

# Human labels for the four image plates in this artwork (edit if PDF changes).
LAYER_LABELS = [
    "01 Background",
    "02 Center photo",
    "03 Lower-left graphic",
    "04 Website strip",
]


def pdf_to_layered_svg(pdf_path: Path, out_path: Path) -> None:
    doc = fitz.open(pdf_path)
    if doc.page_count != 1:
        doc.close()
        raise ValueError(f"Expected a single-page PDF, got {doc.page_count} pages")
    page = doc[0]
    w, h = page.rect.width, page.rect.height
    blocks = sorted(page.get_image_info(xrefs=True), key=lambda d: d["number"])

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
        ' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"',
        f' width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
        f"<title>{pdf_path.stem} (layered from PDF)</title>",
    ]

    for i, block in enumerate(blocks):
        xref = block["xref"]
        bbox = fitz.Rect(block["bbox"]) & page.rect
        if bbox.is_empty:
            continue
        x0, y0, x1, y1 = bbox.x0, bbox.y0, bbox.x1, bbox.y1
        iw, ih = x1 - x0, y1 - y0
        label = LAYER_LABELS[i] if i < len(LAYER_LABELS) else f"Layer {i + 1:02d}"
        gid = f"layer_{i + 1:02d}"
        raw = doc.extract_image(xref)
        ext = raw["ext"]
        if ext == "png":
            mime = "image/png"
        elif ext in ("jpg", "jpeg"):
            mime = "image/jpeg"
        else:
            mime = f"image/{ext}"
        data_uri = f"data:{mime};base64,{base64.standard_b64encode(raw['image']).decode('ascii')}"
        lines.append(
            f'<g id="{gid}" inkscape:groupmode="layer" inkscape:label="{label}" data-name="{label}">'
            f'<image x="{x0}" y="{y0}" width="{iw}" height="{ih}" '
            f'preserveAspectRatio="none" xlink:href="{data_uri}" href="{data_uri}"/>'
            f"</g>"
        )

    lines.append("</svg>")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    doc.close()


def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    if not pdf.is_file():
        raise SystemExit(f"Missing PDF: {pdf}")
    pdf_to_layered_svg(pdf, out)
    mb = out.stat().st_size / (1024 * 1024)
    print(f"Wrote {out} ({mb:.2f} MB)")


if __name__ == "__main__":
    main()
