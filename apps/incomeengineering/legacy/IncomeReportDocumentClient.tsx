"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import {
  beginReportReadyCycle,
  completeReportReadyCycle,
  subscribeReportReadyOnPrint,
} from "@cb/pdf";
import { PrintReportView } from "./components/PrintReportView";
import {
  buildPrintReportViewPropsFromSnapshot,
  type IncomePrintSnapshotV1,
} from "./incomePrintSnapshot";

export function IncomeReportDocumentClient({
  snapshot,
  audit,
}: {
  snapshot: IncomePrintSnapshotV1;
  audit: ReportAuditMeta;
}) {
  const props = useMemo(
    () => buildPrintReportViewPropsFromSnapshot(snapshot, audit),
    [snapshot, audit],
  );

  const printStableKey = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const printReadyTokenRef = useRef(0);

  useLayoutEffect(() => {
    const token = beginReportReadyCycle();
    printReadyTokenRef.current = token;
    try {
      if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
        queueMicrotask(() => {
          void completeReportReadyCycle(token);
        });
      }
    } catch {
      /* ignore */
    }
  }, [printStableKey]);

  const scheduleReportReady = useCallback(() => {
    void completeReportReadyCycle(printReadyTokenRef.current);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
        scheduleReportReady();
      }
    } catch {
      /* ignore */
    }
  }, [printStableKey, scheduleReportReady]);

  useEffect(() => {
    return subscribeReportReadyOnPrint(scheduleReportReady);
  }, [scheduleReportReady]);

  useEffect(() => {
    const onResize = () => {
      try {
        if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
          scheduleReportReady();
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scheduleReportReady]);

  /**
   * Playwright `emulateMedia({ media: 'print' })` does not reliably flip `matchMedia('(print)')` in headless
   * Chromium, so print listeners may never run. Always schedule one stabilisation pass after mount so
   * `__REPORT_READY__` is set for `renderPdf` (real browser print preview still benefits from resize/MQL hooks).
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = printReadyTokenRef.current;
    const id = window.setTimeout(() => {
      void completeReportReadyCycle(token);
    }, 2_000);
    return () => window.clearTimeout(id);
  }, [printStableKey]);

  return (
    <div className="cb-body min-h-screen bg-[#f6f5f1] text-[#0D3A1D]">
      <PrintReportView {...props} />
    </div>
  );
}
