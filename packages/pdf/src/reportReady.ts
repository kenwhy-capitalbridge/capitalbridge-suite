/**
 * Client-side signal consumed by Playwright PDF capture (@cb/pdf/render).
 *
 * Set `window.__REPORT_READY__ = true` only after:
 * - inputs / simulation data used for the report are committed,
 * - chart DOM has measurable layout (under print, when applicable),
 * - Lion verdict copy is composed (same React commit as the report body).
 *
 * Use `beginReportReadyCycle` + `completeReportReadyCycle` so rapid input changes
 * cannot flip the flag to true on a stale paint.
 */
declare global {
  interface Window {
    __REPORT_READY__?: boolean;
  }
}

let reportReadyCycleToken = 0;

export function resetReportReady(): void {
  if (typeof window === "undefined") return;
  window.__REPORT_READY__ = false;
}

export function markReportReady(): void {
  if (typeof window === "undefined") return;
  window.__REPORT_READY__ = true;
}

/** Start a new “report revision”: flag goes false until `completeReportReadyCycle` finishes. Returns token for that revision. */
export function beginReportReadyCycle(): number {
  reportReadyCycleToken += 1;
  resetReportReady();
  return reportReadyCycleToken;
}

function getReportReadyCycleToken(): number {
  return reportReadyCycleToken;
}

/**
 * Wait for fonts, several animation frames, optional `.print-chart-wrap` sizing under print, then idle — then set ready if token matches.
 */
export async function markReportReadyWhenStable(expectedToken?: number): Promise<void> {
  if (typeof window === "undefined") return;

  const tokenAtStart = expectedToken !== undefined ? expectedToken : getReportReadyCycleToken();

  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* ignore */
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });

  if (window.matchMedia?.("(print)")?.matches) {
    for (let f = 0; f < 32; f++) {
      if (getReportReadyCycleToken() !== tokenAtStart) return;
      const roots = document.querySelectorAll(".print-chart-wrap");
      if (roots.length === 0) break;
      const allSized = [...roots].every((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 1 && r.height >= 1;
      });
      if (allSized) break;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }

  await new Promise<void>((resolve) => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => resolve(), { timeout: 250 });
    } else {
      setTimeout(resolve, 0);
    }
  });

  if (getReportReadyCycleToken() !== tokenAtStart) return;
  markReportReady();
}

/** Run `markReportReadyWhenStable` and only keep `__REPORT_READY__` if this revision is still current. */
export async function completeReportReadyCycle(token: number): Promise<void> {
  await markReportReadyWhenStable(token);
}

/** @deprecated Prefer `completeReportReadyCycle` after `beginReportReadyCycle`. */
export function markReportReadyAfterPaint(): void {
  if (typeof window === "undefined") return;
  const t = beginReportReadyCycle();
  void markReportReadyWhenStable(t);
}

/**
 * Playwright switches to print *after* first paint; re-run completion when print media applies
 * so `#print-report` / charts get real dimensions before the flag goes true.
 */
export function subscribeReportReadyOnPrint(scheduleComplete: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(print)");
  const run = () => {
    if (mq.matches) scheduleComplete();
  };
  mq.addEventListener("change", run);
  if (mq.matches) queueMicrotask(run);
  return () => mq.removeEventListener("change", run);
}
