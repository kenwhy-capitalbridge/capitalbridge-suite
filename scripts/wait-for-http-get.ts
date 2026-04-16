/**
 * Poll until a URL responds over HTTP (Node-friendly for local dev + Playwright PDF scripts).
 * Uses Node `http`/`https` for loopback URLs to avoid intermittent `fetch` failures against `next dev`,
 * and treats normal HTTP status codes (incl. Next.js 307 redirects) as “reachable”.
 */

import http from "node:http";
import https from "node:https";

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function shouldProbeWithNode(url: string): boolean {
  try {
    const u = new URL(url);
    return isLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}

function probeOnceWithNode(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        timeout: 8_000,
        headers: { Accept: "*/*", Connection: "close" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("http probe timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function isReachableHttpStatus(status: number): boolean {
  // Next dev often answers `/` with 307; any real HTTP status means the TCP stack + server responded.
  return status >= 200 && status < 600;
}

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
      let status: number;
      if (shouldProbeWithNode(url)) {
        status = await probeOnceWithNode(url);
      } else {
        const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8_000) });
        status = res.status;
      }
      if (isReachableHttpStatus(status)) return;
      lastErr = new Error(`HTTP ${status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitForHttpOk(${url}) timed out after ${timeoutMs}ms: ${String(lastErr)}`);
}
