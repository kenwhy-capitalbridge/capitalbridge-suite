/**
 * Focused checks for @cb/shared staging hostname helpers (no production server).
 * Run: npm run verify:staging-helpers
 */
import assert from "node:assert/strict";

async function run() {
  const orig = { ...process.env };

  const reset = () => {
    for (const k of Object.keys(process.env)) {
      if (!(k in orig)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(orig)) {
      process.env[k] = v;
    }
  };

  try {
    process.env.NODE_ENV = "production";
    const staging = await import("../packages/shared/src/staging.ts");

    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_CB_STAGING_HOSTNAME;
    assert.equal(staging.getStagingCapitalBridgeHostname(), "staging.thecapitalbridge.com");
    assert.equal(staging.isStagingCapitalBridgeHost("staging.thecapitalbridge.com"), true);
    assert.equal(staging.isStagingCapitalBridgeHost("platform.thecapitalbridge.com"), false);
    assert.equal(staging.getAppEnv("platform.thecapitalbridge.com"), "production");

    process.env.NEXT_PUBLIC_APP_URL = "https://staging.thecapitalbridge.com";
    assert.equal(staging.getStagingCapitalBridgeHostname(), "staging.thecapitalbridge.com");

    process.env.NEXT_PUBLIC_APP_URL = "https://platform.thecapitalbridge.com";
    assert.equal(
      staging.getStagingCapitalBridgeHostname(),
      "staging.thecapitalbridge.com",
      "mis-set production URL in NEXT_PUBLIC_APP_URL must be ignored",
    );

    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.NEXT_PUBLIC_CB_STAGING_HOSTNAME = "staging.example.test";
    assert.equal(staging.getStagingCapitalBridgeHostname(), "staging.example.test");
    assert.equal(staging.isStagingHost("staging.example.test"), true);
  } finally {
    reset();
  }

  console.log("verify-staging-helpers: all checks passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
