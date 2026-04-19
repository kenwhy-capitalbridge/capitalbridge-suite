import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { withSuiteAuthCookieOptions, type AuthCookieOptions } from "./authCookieOptions";

/**
 * Server Supabase client for Server Components / Route Handlers.
 * Uses suite-wide cookie domain in production unless `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host`.
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
            cookieStore.set(name, value, withSuiteAuthCookieOptions(options as AuthCookieOptions));
          });
        } catch {
          // read-only in some server component contexts
        }
      },
    },
  });
}

