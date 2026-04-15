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
    if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
      queueMicrotask(() => {
        void completeReportReadyCycle(token);
      });
    }
  }, [printStableKey]);

  const scheduleReportReady = useCallback(() => {
    void completeReportReadyCycle(printReadyTokenRef.current);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
      scheduleReportReady();
    }
  }, [printStableKey, scheduleReportReady]);

  useEffect(() => {
    return subscribeReportReadyOnPrint(scheduleReportReady);
  }, [scheduleReportReady]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
        scheduleReportReady();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scheduleReportReady]);

  return (
    <div className="cb-body min-h-screen bg-[#f6f5f1] text-[#0D3A1D]">
      <PrintReportView {...props} />
    </div>
  );
}
