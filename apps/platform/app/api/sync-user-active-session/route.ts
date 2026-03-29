import { NextRequest, NextResponse } from "next/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { createAppServerClient } from "@cb/supabase/server";
import { syncUserActiveSessionFromAccessToken } from "@cb/advisory-graph/server/userActiveSessionSync";

export const dynamic = "force-dynamic";

function safeInternalNext(path: string | null): string {
  if (!path || path === "") return "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  if (path.length > 512) return "/";
  return path;
}

/**
 * GET: align `public.user_active_session` with the Supabase session in cookies, then redirect.
 * Linked from model-app BACK buttons so the next platform request passes session-slot checks.
 */
export async function GET(req: NextRequest) {
  const nextPath = safeInternalNext(req.nextUrl.searchParams.get("next"));

  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const login = new URL(`${LOGIN_APP_URL.replace(/\/+$/, "")}/access`);
      login.searchParams.set("redirectTo", `${req.nextUrl.origin}${nextPath}`);
      return NextResponse.redirect(login.toString());
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await syncUserActiveSessionFromAccessToken(
      user.id,
      session?.access_token,
      "[platform sync-user-active-session]",
    );

    return NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
  } catch (e) {
    console.error("[sync-user-active-session]", e);
    return NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
  }
}
