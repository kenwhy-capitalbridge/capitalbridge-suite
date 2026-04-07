"use client";

/**
 * Canonical PDF document shell for all Capital Bridge model reports (Forever Income = source of truth).
 * Re-exports the advisory graph implementation so apps import one layout entry point (`@cb/pdf/shared`).
 */
export type { AdvisoryReportPdfDocumentRootProps as PdfLayoutProps } from "@cb/advisory-graph/reports";
export { AdvisoryReportPdfDocumentRoot as PdfLayout } from "@cb/advisory-graph/reports";
