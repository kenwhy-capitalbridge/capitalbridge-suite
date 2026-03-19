import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOGIN_APP_URL } from "@cb/shared/urls";

function isProtected(pathname: string): boolean {
  return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/**
 * Protects / and dashboard routes: redirects to login if no Supabase session.
 * Membership enforcement (active vs expired) remains in the dashboard page (PaymentGate).
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

  const response = NextResponse.next({ request: req });
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
    const loginUrl = new URL(`${LOGIN_APP_URL}/access`);
    loginUrl.searchParams.set("redirectTo", req.nextUrl.origin + req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl.toString());
  }

  return response;
}

