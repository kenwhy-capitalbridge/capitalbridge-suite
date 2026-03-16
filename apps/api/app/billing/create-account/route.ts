import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  name?: string;
};

function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "invalid_password", detail: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const svc = createServiceClient();
    const { data, error } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });

    if (error || !data.user?.id) {
      const message = String(error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        return NextResponse.json({ error: "account_exists" }, { status: 409 });
      }
      return NextResponse.json(
        { error: "account_create_failed", detail: error?.message ?? "unknown" },
        { status: 500 }
      );
    }

    await svc
      .schema("public")
      .from("profiles")
      .upsert({ id: data.user.id, email }, { onConflict: "id" })
      .then(() => {}, () => {});

    return NextResponse.json({ ok: true, user_id: data.user.id, email });
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
