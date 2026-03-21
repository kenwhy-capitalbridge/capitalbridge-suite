import { redirect } from "next/navigation";

/**
 * Legacy /login → unified /access (set password from email link, sign-in).
 */
export default function LoginRedirectPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string | string[] };
}) {
  const r = searchParams.redirectTo;
  const q = new URLSearchParams();
  if (typeof r === "string" && r) q.set("redirectTo", r);
  const qs = q.toString();
  redirect(qs ? `/access?${qs}` : "/access");
}
