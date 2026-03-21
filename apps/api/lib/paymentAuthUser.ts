import { randomBytes } from "crypto";
import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

function tempPassword(): string {
  return randomBytes(28).toString("base64url");
}

function isDuplicateEmailError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  return (
    m.includes("already") ||
    m.includes("registered") ||
    m.includes("exists") ||
    err.code === "email_exists"
  );
}

/**
 * Payment-first: resolve Supabase Auth user for a paid billing session.
 * - Prefer existing `billing_sessions.user_id` if valid in Auth.
 * - Otherwise create via admin API with `email_confirm: true` (no "Confirm Sign Up").
 * - If email already registered, find user and ensure confirmed.
 * Does not use `signUp()` or invite flows.
 */
export async function resolveAuthUserForPayment(
  svc: Svc,
  params: {
    billingSessionUserId: string | null | undefined;
    sessionEmail: string | null | undefined;
  }
): Promise<{ userId: string; email: string }> {
  const email = params.sessionEmail?.trim() ?? "";
  if (!email) {
    throw new Error("missing_session_email");
  }

  const preId = params.billingSessionUserId?.trim() ?? "";

  if (preId) {
    const { data: wrap, error } = await svc.auth.admin.getUserById(preId);
    if (wrap?.user?.id) {
      const u = wrap.user;
      if (!u.email_confirmed_at) {
        await svc.auth.admin.updateUserById(u.id, { email_confirm: true });
      }
      return { userId: u.id, email: (u.email ?? email).trim() };
    }
    console.warn("[payment-auth] session user_id not found in auth; creating or resolving by email", {
      preId,
      message: error?.message,
    });
  }

  const { data: created, error: cErr } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    password: tempPassword(),
    user_metadata: { checkout_pending: true },
  });

  if (created?.user?.id) {
    return { userId: created.user.id, email };
  }

  if (isDuplicateEmailError(cErr)) {
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found?.id) {
      await svc.auth.admin.updateUserById(found.id, { email_confirm: true });
      return { userId: found.id, email };
    }
  }

  throw new Error(cErr?.message ?? "auth_user_create_failed");
}
