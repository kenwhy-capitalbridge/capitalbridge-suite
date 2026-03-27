#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "Lion Verdict dynamic copy.txt");
const OUTPUT_PATH = path.join(ROOT, "packages", "lion-verdict", "copy.ts");
const IS_CHECK = process.argv.includes("--check");

const TIERS = ["STRONG", "STABLE", "FRAGILE", "AT_RISK", "NOT_SUSTAINABLE"];

function normalizeTierLabel(raw) {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (!TIERS.includes(t)) {
    throw new Error(`Unknown tier "${raw}" from source file`);
  }
  return t;
}

function cleanLine(raw) {
  return raw.replace(/^•\s*/u, "").replace(/\s+/g, " ").trim();
}

function parseSource(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let tier = null;
  let section = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^_+$/.test(line)) continue;

    const tierMatch = line.match(/^\d+\)\s+([A-Z_ ]+)$/);
    if (tierMatch) {
      tier = normalizeTierLabel(tierMatch[1]);
      out[tier] = { headlines: [], guidance: [] };
      section = null;
      continue;
    }

    if (!tier) continue;

    if (/^headlines$/i.test(line)) {
      section = "headlines";
      continue;
    }
    if (/^guidance$/i.test(line)) {
      section = "guidance";
      continue;
    }

    if (!section) continue;
    if (rawLine.includes("•")) {
      const clean = cleanLine(rawLine);
      if (clean) out[tier][section].push(clean);
    }
  }

  for (const t of TIERS) {
    if (!out[t]) {
      throw new Error(`Missing tier section: ${t}`);
    }
    if (out[t].headlines.length === 0) {
      throw new Error(`Tier ${t} has no headlines`);
    }
    if (out[t].guidance.length === 0) {
      throw new Error(`Tier ${t} has no guidance`);
    }
  }

  return out;
}

function toTs(data) {
  const header = `/**\n * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n * Source: /Lion Verdict dynamic copy.txt\n * Generator: scripts/sync-lion-copy.mjs\n */\n\n`;
  let body = "";
  body += "export type Tier = 'STRONG' | 'STABLE' | 'FRAGILE' | 'AT_RISK' | 'NOT_SUSTAINABLE';\n\n";
  body += "export type Line = {\n  text: string;\n  weight: number;\n};\n\n";
  body += "export const LION_COPY: Record<Tier, { headlines: Line[]; guidance: Line[] }> = {\n";

  for (const tier of TIERS) {
    body += `  ${tier}: {\n`;
    body += "    headlines: [\n";
    for (const h of data[tier].headlines) {
      body += `      { text: ${JSON.stringify(h)}, weight: 3 },\n`;
    }
    body += "    ],\n";
    body += "    guidance: [\n";
    for (const g of data[tier].guidance) {
      body += `      { text: ${JSON.stringify(g)}, weight: 3 },\n`;
    }
    body += "    ],\n";
    body += "  },\n";
  }

  body += "};\n";
  return header + body;
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Source not found: ${SOURCE_PATH}`);
  }
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  const parsed = parseSource(source);
  const generated = toTs(parsed);
  const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, "utf8") : "";
  const inSync = current === generated;
  if (IS_CHECK) {
    if (!inSync) {
      console.error(
        `Lion copy is out of sync. Run: npm run lion:sync-copy (target: ${path.relative(ROOT, OUTPUT_PATH)})`,
      );
      process.exit(1);
    }
    console.log(`Lion copy is in sync: ${path.relative(ROOT, OUTPUT_PATH)}`);
  } else {
    fs.writeFileSync(OUTPUT_PATH, generated, "utf8");
    console.log(`Synced Lion copy -> ${path.relative(ROOT, OUTPUT_PATH)}`);
  }
  for (const tier of TIERS) {
    console.log(
      `${tier}: ${parsed[tier].headlines.length} headlines, ${parsed[tier].guidance.length} guidance`,
    );
  }
}

main();
