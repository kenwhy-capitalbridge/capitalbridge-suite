import { CB_REPORT_TRIAL_SNAPSHOT_CAPTION } from "@cb/shared/reportTrialCopy";

/** Trial-only line under the opening snapshot heading (Forever + other model PDFs). */
export function ReportTrialSnapshotCaption({ isTrial }: { isTrial: boolean }) {
  if (!isTrial) return null;
  return (
    <p
      className="cb-report-trial-snapshot-caption m-0 mb-3 block w-full max-w-[48em] text-[10.5px] leading-snug"
      style={{ color: "rgba(13, 58, 29, 0.75)" }}
    >
      {CB_REPORT_TRIAL_SNAPSHOT_CAPTION}
    </p>
  );
}
