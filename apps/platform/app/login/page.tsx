import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LOGIN_APP_URL } from "@cb/shared/urls";

export const dynamic = "force-dynamic";

export default async function LoginRedirectPage() {
  const h = await headers();
  const host = h.get("host") ?? "platform.thecapitalbridge.com";
  const loginUrl = new URL(`${LOGIN_APP_URL}/login`);
  loginUrl.searchParams.set("redirectTo", `https://${host}`);
  redirect(loginUrl.toString());
}

