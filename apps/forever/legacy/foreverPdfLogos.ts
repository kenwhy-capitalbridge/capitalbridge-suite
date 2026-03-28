/**
 * Rasterize green brand SVGs to PNG data URLs for jsPDF (jsPDF does not embed SVG reliably).
 * Browser: fetch /brand/*.svg (from `npm run brand:sync`), draw to canvas.
 */

/** Raster size for cover logos. Wordmark matches SVG viewBox ratio (~568.7×114.5) so raster is not cropped. */
const LION_RASTER_PX = 128;
const WORDMARK_RASTER_PX = { w: Math.ceil((90 * 568.703125) / 114.5), h: 90 };

async function rasterizeSvgUrlToPngDataUrl(
  svgUrl: string,
  outW: number,
  outH: number,
): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const res = await fetch(svgUrl);
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg raster"));
      img.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }
    ctx.drawImage(img, 0, 0, outW, outH);
    URL.revokeObjectURL(objectUrl);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Load green lion + wordmark as PNG data URLs for the Forever PDF cover row. */
export async function loadForeverGreenBrandLogosForPdf(): Promise<{
  lionPngDataUrl: string | null;
  wordmarkPngDataUrl: string | null;
}> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lionUrl = `${origin}/brand/lionhead_Green.svg`;
  const wordUrl = `${origin}/brand/CapitalBridgeLogo_Green.svg`;
  const [lionPngDataUrl, wordmarkPngDataUrl] = await Promise.all([
    rasterizeSvgUrlToPngDataUrl(lionUrl, LION_RASTER_PX, LION_RASTER_PX),
    rasterizeSvgUrlToPngDataUrl(wordUrl, WORDMARK_RASTER_PX.w, WORDMARK_RASTER_PX.h),
  ]);
  return { lionPngDataUrl, wordmarkPngDataUrl };
}
