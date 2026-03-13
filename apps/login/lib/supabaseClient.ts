"use client";

import { createAppBrowserClient, isSupabaseConfigured } from "@cb/supabase/browser";

/**
 * Supabase client for the login app. All user identity and auth state comes from
 * Supabase as the single source of truth (no local user store).
 */
export const supabase = createAppBrowserClient();
export { isSupabaseConfigured };

