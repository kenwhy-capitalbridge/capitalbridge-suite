import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { API_APP_URL } from "@cb/shared/urls";

/**
 * Server proxy: forwards to API with the user's JWT (avoids CORS and keeps the token off the client).
 */
export async function POST(req: Request) {
  const supabase = await createAppServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const apiUrl = `${API_APP_URL.replace(/\/+$/, "")}/billing/request-market-change`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body,
  });

  const payload = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}
