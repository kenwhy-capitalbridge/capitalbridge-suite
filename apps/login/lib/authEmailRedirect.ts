/**
 * Absolute URL for Supabase Auth email actions (recovery, OTP).
 * Must match an entry in Supabase Dashboard → Auth → Redirect URLs.
 */
export function getAccessRedirectUrlForAuthEmails(): string {
  const base = (process.env.NEXT_PUBLIC_LOGIN_APP_URL ?? "https://login.thecapitalbridge.com").replace(
    /\/$/,
    ""
  );
  return `${base}/access`;
}
