import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public diagnostic: which Git build is running (no auth).
 * Use: curl -sS https://platform.thecapitalbridge.com/api/build-info
 */
export async function GET() {
  return NextResponse.json(
    {
      app: "platform",
      monorepo: "capitalbridge-suite",
      root: "apps/platform",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
