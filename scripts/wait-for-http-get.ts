/**
 * Poll until a URL returns HTTP 200 (or network succeeds). Used by sample-PDF scripts
 * before Playwright `page.goto`, so rendering always hits a real Next app.
 */

export async function waitForHttpOk(
  url: string,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const intervalMs = opts?.intervalMs ?? 400;
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitForHttpOk(${url}) timed out after ${timeoutMs}ms: ${String(lastErr)}`);
}
