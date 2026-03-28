import { redirect } from "next/navigation";

/**
 * Legacy /login → unified /access (set password from email link, sign-in).
 */
export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const sp = await searchParams;
  const r = sp.redirectTo;
  const q = new URLSearchParams();
  if (typeof r === "string" && r) q.set("redirectTo", r);
  const qs = q.toString();
  redirect(qs ? `/access?${qs}` : "/access");
}
