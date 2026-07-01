const fs = require("fs");
const path = require("path");

const outFile = path.join(__dirname, "..", ".auth", "storage.json");

function loginOrigin() {
  return (process.env.CB_E2E_LOGIN_ORIGIN || "https://login.thecapitalbridge.com").replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasSuiteAuthCookie(cookies) {
  return cookies.some(
    (c) =>
      c.domain === ".thecapitalbridge.com" &&
      /^sb-.+-auth-token$/.test(c.name) &&
      c.value &&
      c.value.length > 0,
  );
}

async function waitForSuiteAuthCookie(context, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (hasSuiteAuthCookie(await context.cookies())) {
      await sleep(1500);
      return;
    }
    await sleep(500);
  }
  throw new Error(
    `[e2e] Timed out after ${deadlineMs / 1000}s waiting for suite auth cookie on .thecapitalbridge.com`,
  );
}

function ensureAuthDir() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
}

function writeStorageFromEnvJson() {
  const raw = process.env.CB_E2E_STORAGE_JSON;
  if (!raw || !raw.trim()) {
    throw new Error("CB_E2E_STORAGE_JSON is empty");
  }
  ensureAuthDir();
  fs.writeFileSync(outFile, raw, "utf8");
  let data;
  try {
    data = JSON.parse(fs.readFileSync(outFile, "utf8"));
  } catch {
    throw new Error("CB_E2E_STORAGE_JSON is not valid JSON");
  }
  const cookies = Array.isArray(data.cookies) ? data.cookies : [];
  if (cookies.length === 0) {
    throw new Error("CB_E2E_STORAGE_JSON has no cookies — regenerate with npm run e2e:storage");
  }
}

module.exports = {
  outFile,
  loginOrigin,
  sleep,
  hasSuiteAuthCookie,
  waitForSuiteAuthCookie,
  ensureAuthDir,
  writeStorageFromEnvJson,
};
