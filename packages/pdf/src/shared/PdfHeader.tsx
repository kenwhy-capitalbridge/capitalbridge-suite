"use client";

/**
 * Fixed print header band (model + report meta). Prefer composing via `PdfLayout`, which mounts
 * this together with `PdfFooter` through `ReportPrintChrome`.
 */
export type { ReportPrintHeaderProps as PdfHeaderProps } from "@cb/ui";
export { ReportPrintHeader as PdfHeader } from "@cb/ui";
