import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOGIN_APP_URL } from "@cb/shared/urls";

function isProtected(pathname: string): boolean {
  return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function redirectToSignIn(req: NextRequest) {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("redirectTo", `${req.nextUrl.origin}${req.nextUrl.pathname}`);
  return NextResponse.redirect(u.toString());
}

/** No platform redirectTo — avoids loop when membership is inactive */
function redirectMembershipInactive() {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("membership_inactive", "1");
  return NextResponse.redirect(u.toString());
}

function redirectSessionCleared() {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("session_cleared", "1");
  return NextResponse.redirect(u.toString());
}

/**
 * Platform: require Supabase session + profile row + row in active_memberships.
 * Session alone is not enough (stale cookie after expiry or deleted profile).
 */
export async function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToSignIn(req);
  }

  const { data: profile, error: profileErr } = await supabase
    .schema("public")
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[platform middleware] profiles lookup failed", profileErr.message);
    return redirectMembershipInactive();
  }

  if (!profile) {
    response = redirectSessionCleared();
    const supabaseSignOut = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    await supabaseSignOut.auth.signOut();
    return response;
  }

  const { data: activeMembership, error: amErr } = await supabase
    .schema("public")
    .from("active_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (amErr) {
    console.error("[platform middleware] active_memberships lookup failed", amErr.message);
    return redirectMembershipInactive();
  }

  if (!activeMembership) {
    return redirectMembershipInactive();
  }

  return response;
}
