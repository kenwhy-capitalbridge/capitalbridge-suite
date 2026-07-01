#!/usr/bin/env node
/**
 * CI bootstrap: prefer fresh headless login when CB_E2E_EMAIL/PASSWORD are set,
 * otherwise fall back to CB_E2E_STORAGE_JSON.
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { writeStorageFromEnvJson } = require("./storage-state-utils.cjs");

const email = process.env.CB_E2E_EMAIL?.trim();
const password = process.env.CB_E2E_PASSWORD?.trim();

if (email && password) {
  execFileSync(process.execPath, [path.join(__dirname, "login-storage-state.cjs")], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(0);
}

writeStorageFromEnvJson();
console.error("[e2e] Using CB_E2E_STORAGE_JSON for auth storage");
