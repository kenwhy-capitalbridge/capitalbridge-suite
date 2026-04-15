/**
 * CI smoke: exercise `renderPdf` + Playwright Chromium (same stack as Forever / Capital Stress API routes).
 * Serves a minimal HTML page on 127.0.0.1, captures to a temp PDF — no Next.js dev server.
 *
 * Run from repo root: npx tsx scripts/ci/pdf-render-smoke.ts
 * Prereq: `npx playwright install chromium` (CI workflow installs this).
 */

import http from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPdf } from "@cb/pdf/render";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script>window.__REPORT_READY__ = true;</script>
  <title>PDF smoke</title>
</head>
<body>
  <p>Capital Bridge PDF render smoke (Playwright Chromium).</p>
</body>
</html>`;

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

void (async () => {
  const server = http.createServer((_, res) => {
    // Close the connection so Playwright `networkidle` can settle (HTTP/1.1 keep-alive otherwise stays open).
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      Connection: "close",
    });
    res.end(html);
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const addr = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}/`;
  const outDir = mkdtempSync(join(tmpdir(), "cb-pdf-smoke-"));
  const outputPath = join(outDir, "smoke.pdf");

  try {
    await renderPdf({
      url,
      outputPath,
      waitForReportReadySignal: true,
    });
    const buf = readFileSync(outputPath);
    if (buf.length < 200) {
      console.error("PDF output unexpectedly small:", buf.length);
      process.exit(1);
    }
    if (buf.subarray(0, 4).toString() !== "%PDF") {
      console.error("Output is not a PDF (missing %PDF header)");
      process.exit(1);
    }
    console.log(`OK: ${outputPath} (${buf.length} bytes)`);
  } finally {
    try {
      unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
    await closeServer(server);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
