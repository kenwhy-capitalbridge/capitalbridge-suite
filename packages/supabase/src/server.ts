import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieOptions = Record<string, unknown>;

function isProd() {
  return process.env.NODE_ENV === "production";
}

function withSuiteCookieOptions(options?: CookieOptions) {
  if (!isProd()) return options ?? {};
  return {
    ...(options ?? {}),
    domain: ".thecapitalbridge.com",
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}

/**
 * Server Supabase client for Server Components / Route Handlers.
 * Uses cookie domain `.thecapitalbridge.com` in production so login + platform share sessions.
 */
export async function createAppServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, withSuiteCookieOptions(options as CookieOptions));
          });
        } catch {
          // read-only in some server component contexts
        }
      },
    },
  });
}

