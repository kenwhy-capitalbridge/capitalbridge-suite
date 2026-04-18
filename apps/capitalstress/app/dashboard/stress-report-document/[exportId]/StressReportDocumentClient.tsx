"use client";

import {
  beginReportReadyCycle,
  completeReportReadyCycle,
  subscribeReportReadyOnPrint,
} from "@cb/pdf";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { PrintReport } from "@/legacy/PrintReport";
import {
  buildPrintReportPropsFromSnapshot,
  type StressPrintSnapshotV1,
} from "@/legacy/stressPrintSnapshot";

export function StressReportDocumentClient({
  snapshot,
  audit,
}: {
  snapshot: StressPrintSnapshotV1;
  audit: ReportAuditMeta;
}) {
  const props = useMemo(
    () => buildPrintReportPropsFromSnapshot(snapshot, audit),
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
   * Playwright `emulateMedia({ media: 'print' })` does not always flip `matchMedia('(print)')` in headless
   * Chromium; schedule stabilisation so `__REPORT_READY__` is set without waiting for the full
   * `reportReadyTimeoutMs` fallback in `renderPdf`.
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
    <div className="cb-body min-h-screen bg-[#f7faf7] text-[#0D3A1D]">
      <PrintReport {...props} />
    </div>
  );
}
