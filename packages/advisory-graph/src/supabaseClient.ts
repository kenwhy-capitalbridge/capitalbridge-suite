/**
 * Browser Supabase client for model apps + dashboard client components.
 *
 * Delegates to `@cb/supabase/browser` so auth uses the same cookie-based session
 * as login + platform (e.g. domain `.thecapitalbridge.com` in production). A plain
 * `@supabase/supabase-js` client only used localStorage per origin, so Forever /
 * other subdomains often had no JWT and persona RPCs looked like trial.
 */

export { createAppBrowserClient as createSupabaseBrowserClient } from "@cb/supabase/browser";
