// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline
import { Font } from '@react-pdf/renderer';

/** Match Node PDF render: avoid mid-word hyphenation breaks in advisory PDFs. */
export function registerCapitalHealthPdfHyphenation(): void {
  Font.registerHyphenationCallback((word) => [word]);
}
