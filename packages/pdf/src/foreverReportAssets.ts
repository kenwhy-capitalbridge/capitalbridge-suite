/**
 * Forever Income v6 PDF — STEP 2 asset resolver (Node / Playwright pipelines only).
 *
 * Resolution order per asset:
 * 1) Hardcoded absolute paths (developer machine; spec paths)
 * 2) Paths under CB_CAPITALBRIDGE_SUITE_ROOT (optional env), if set
 * 3) Paths under auto-detected monorepo root (walk up from this file for package.json name capitalbridge-suite)
 *
 * No network or SharePoint. Throws with full attempted path list on failure.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo-relative paths from suite root (fallback when absolutes missing). */
export const FOREVER_REPORT_REPO_RELATIVE = {
  lionCopy: "Lion Verdict dynamic copy.txt",
  logoFooter: "packages/ui/src/assets/CapitalBridgeLogo_Green.svg",
  logoCover: "packages/ui/src/assets/Full_CapitalBridge_Green.svg",
} as const;

export type ForeverReportAssetKind = keyof typeof FOREVER_REPORT_REPO_RELATIVE;

/** Developer-machine absolutes (try first). */
const ABSOLUTE_PRIMARY: Record<ForeverReportAssetKind, readonly string[]> = {
  lionCopy: [
    "/Users/kennethwong/Downloads/capitalbridge-suite/Lion Verdict dynamic copy.txt",
  ],
  logoFooter: [
    "/Users/kennethwong/Downloads/capitalbridge-suite/packages/ui/src/assets/CapitalBridgeLogo_Green.svg",
  ],
  logoCover: [
    "/Users/kennethwong/Downloads/capitalbridge-suite/packages/ui/src/assets/Full_CapitalBridge_Green.svg",
  ],
};

function isSuiteRoot(dir: string): boolean {
  try {
    if (!existsSync(join(dir, "package.json"))) return false;
    const raw = readFileSync(join(dir, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { name?: string; workspaces?: unknown };
    return pkg.name === "capitalbridge-suite";
  } catch {
    return false;
  }
}

/**
 * Walk parents from `startDir` to find the monorepo root (package name capitalbridge-suite).
 */
export function findCapitalbridgeSuiteRoot(startDir: string = __dirname): string {
  let dir = startDir;
  for (;;) {
    if (isSuiteRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not find capitalbridge-suite monorepo root (walked up from ${startDir}). ` +
      "Set CB_CAPITALBRIDGE_SUITE_ROOT to the repo root, or run from a checkout that contains package.json name \"capitalbridge-suite\".",
  );
}

function envSuiteRoot(): string | null {
  const v = process.env.CB_CAPITALBRIDGE_SUITE_ROOT?.trim();
  return v && v.length > 0 ? v : null;
}

/**
 * All candidate paths for an asset in resolution order (for errors / debugging).
 */
export function foreverReportAssetCandidatePaths(kind: ForeverReportAssetKind): string[] {
  const rel = FOREVER_REPORT_REPO_RELATIVE[kind];
  const out: string[] = [];

  for (const p of ABSOLUTE_PRIMARY[kind]) {
    out.push(p);
  }

  const envRoot = envSuiteRoot();
  if (envRoot) {
    out.push(join(envRoot, rel));
  }

  try {
    out.push(join(findCapitalbridgeSuiteRoot(), rel));
  } catch {
    /* findCapitalbridgeSuiteRoot failed — only absolutes + env remain */
  }

  return [...new Set(out)];
}

/**
 * First existing file among candidates; throws listing every attempt if none found.
 */
export function resolveForeverReportAssetPath(kind: ForeverReportAssetKind): string {
  const attempts = foreverReportAssetCandidatePaths(kind);
  for (const p of attempts) {
    try {
      if (existsSync(p) && statSync(p).isFile()) return p;
    } catch {
      /* continue */
    }
  }
  throw new Error(
    `Forever report asset "${kind}" not found. Tried:\n${attempts.map((a) => `  - ${a}`).join("\n")}`,
  );
}

export function readTextFile(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

export function readSvgFile(absolutePath: string): string {
  return readTextFile(absolutePath);
}

/** SVG string → data URI for Playwright footerTemplate / img src (no external fetch). */
export function svgToDataUri(svgString: string): string {
  const b64 = Buffer.from(svgString.trim(), "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

export function loadForeverReportLionCopyText(): string {
  return readTextFile(resolveForeverReportAssetPath("lionCopy"));
}

export function loadForeverReportLogoFooterSvg(): string {
  return readSvgFile(resolveForeverReportAssetPath("logoFooter"));
}

export function loadForeverReportLogoCoverSvg(): string {
  return readSvgFile(resolveForeverReportAssetPath("logoCover"));
}

export function loadForeverReportLogoFooterDataUri(): string {
  return svgToDataUri(loadForeverReportLogoFooterSvg());
}

/**
 * STEP 2 audit helper: load all three assets; throws with paths if any missing.
 */
export function assertForeverReportAssetsResolvable(): void {
  resolveForeverReportAssetPath("lionCopy");
  resolveForeverReportAssetPath("logoFooter");
  resolveForeverReportAssetPath("logoCover");
}
