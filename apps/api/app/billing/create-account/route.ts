import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  /** @deprecated use firstName + lastName */
  name?: string;
  firstName?: string;
  lastName?: string;
};

function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    let firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    let lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    if (!firstName || !lastName) {
      const legacy = typeof body.name === "string" ? body.name.trim() : "";
      if (legacy) {
        const parts = legacy.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          lastName = parts.pop() ?? "";
          firstName = parts.join(" ");
        } else if (parts.length === 1) {
          firstName = parts[0] ?? "";
        }
      }
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "name_required", detail: "first_name_and_last_name_required" },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

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
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        name: fullName,
      },
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
      .upsert(
        { id: data.user.id, email, first_name: firstName, last_name: lastName },
        { onConflict: "id" }
      )
      .then(() => {}, () => {});

    return NextResponse.json({ ok: true, user_id: data.user.id, email });
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
