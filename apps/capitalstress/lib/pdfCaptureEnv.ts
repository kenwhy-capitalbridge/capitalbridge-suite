/**
 * Read only from this app (not @cb/shared): Next.js must see `process.env.*` here so values are not stripped when bundling workspace packages.
 */
export function getPdfCaptureSecret(): string | null {
  const a = process.env.REPORT_PDF_CAPTURE_SECRET?.trim();
  if (a) return a;
  const b = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (b) return b;
  return null;
}
