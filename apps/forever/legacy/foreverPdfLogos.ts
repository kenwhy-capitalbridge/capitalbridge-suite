/**
 * Rasterize green brand SVGs to PNG data URLs for jsPDF (jsPDF does not embed SVG reliably).
 * Browser: fetch /brand/*.svg (from `npm run brand:sync`), draw to canvas.
 */

/** Full lockup (lion + wordmark) on light PDF cover — wide raster preserves legibility. */
const FULL_LOCKUP_RASTER_PX = { w: 360, h: 72 };

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

/** Load green full lockup as PNG for the Forever PDF cover (light background). */
export async function loadForeverGreenBrandLogosForPdf(): Promise<{
  fullLockupPngDataUrl: string | null;
}> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = `${origin}/brand/Full_CapitalBridge_Green.svg`;
  const fullLockupPngDataUrl = await rasterizeSvgUrlToPngDataUrl(
    fullUrl,
    FULL_LOCKUP_RASTER_PX.w,
    FULL_LOCKUP_RASTER_PX.h,
  );
  return { fullLockupPngDataUrl };
}
