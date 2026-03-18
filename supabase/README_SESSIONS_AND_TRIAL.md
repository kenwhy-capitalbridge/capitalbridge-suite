# Session Management and Trial Limit

This document describes the Supabase-backed system for **one session per account**, **cookie/IP/User-Agent matching**, **token reuse protection**, and **maximum 2 trials per account**.

---

## 1. How to run the migration

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Copy the full contents of:
   ```
   supabase/migrations/20260310000000_user_sessions_and_trial_limit.sql
   ```
3. Paste and run the script.

**Prerequisites:**

- Table **`public.profiles`** must exist (and typically has `id` = `auth.users.id`). The migration adds columns to `profiles` and creates **`user_sessions`** with `user_id REFERENCES public.profiles(id)`.
- Table **`public.subscriptions`** must exist with either a **`plan_id`** or **`plan`** column (text). The trial trigger works with either; the function detects which column exists.
- Ensure each user has a **`profiles`** row (e.g. created by an `auth.users` trigger on signup). Otherwise `replace_user_session` will fail when inserting into `user_sessions`.

---

## 2. How one-session-per-account works

- **Table `public.user_sessions`** has at most **one row per user** (enforced by `user_id` as primary key).
- On **login**, the app calls **`POST /api/register-session`**, which calls **`replace_user_session`**:
  - Deletes any existing row for that user.
  - Inserts a new row with the current access token, IP, and User-Agent.
- So only the **latest** login is stored; previous sessions are no longer valid for validation (see token reuse protection below).

---

## 3. How session validation works (token reuse protection)

When a request hits a **protected API** (or middleware):

1. Resolve the Supabase user from the session cookie.
2. Load the **`user_sessions`** row for that user.
3. **If there is no row** → treat as invalid → **force login** (e.g. return 401).
4. **If `stored session_token` ≠ current Supabase access token** → invalid → **force login** (prevents reuse of old or stolen tokens).
5. Optionally compare request **IP** and **User-Agent** to stored values; on mismatch, invalidate or force re-authentication.

The login app provides **`validateSession(supabase, request, options?)`** in **`apps/login/lib/validateSession.ts`**. Use it in route handlers:

```ts
const validation = await validateSession(supabase, request);
if (!validation.valid) {
  return NextResponse.json({ error: "Session invalid" }, { status: 401 });
}
// validation.userId is the authenticated user id
```

Optional flags: **`strictIp`** and **`strictUserAgent`** to require IP/User-Agent match.

---

## 4. How cookie/IP/User-Agent matching works

- On **login**, **`replace_user_session`** is called with:
  - **`p_session_token`**: current Supabase access token.
  - **`p_ip_address`**: from `x-forwarded-for` or `x-real-ip` (or null).
  - **`p_user_agent`**: from `User-Agent` header (or null).

- These are stored in **`user_sessions`** and in **`profiles.last_login_at`** / **`profiles.last_login_ip`** for audit.

- When **validating** a request, you can:
  - **Require** that the request’s IP and User-Agent match the stored values (use **`validateSession(..., { strictIp: true, strictUserAgent: true })`**), or
  - Use them only for **logging/flagging** and still enforce token match.

---

## 5. How trial limits are enforced

- **Trigger `enforce_trial_limit`** runs **BEFORE INSERT** on **`public.subscriptions`**.
- For the inserted row, the function checks if it is a trial:
  - If **`subscriptions.plan_id = 'trial'`** (or **`subscriptions.plan = 'trial'`** if the table has no `plan_id`), then:
    - Read **`profiles.trial_count`** for `subscriptions.user_id`.
    - If **`trial_count >= 2`** → **raise exception** `'Trial limit reached (max 2 per account).'` → the INSERT fails.
    - If **`trial_count < 2`** → increment **`profiles.trial_count`** by 1 and allow the INSERT.

So the **database** enforces the limit; the app should catch the error and show a friendly message.

---

## 6. How to use the can-start-trial endpoint

- **Endpoint:** **`GET /api/can-start-trial`** (login app).
- **Returns:**  
  `{ canStartTrial: boolean, trialCount: number, reason?: string }`
- **Logic:** Reads **`profiles.trial_count`** for the current user. If **`trial_count >= 2`**, **`canStartTrial`** is `false` and **`reason`** can be **`"limit_reached"`** (or **`"not_logged_in"`** if unauthenticated).

**Usage:** Before sending the user to signup or confirm-payment for a trial, call this endpoint. If **`canStartTrial === false`**, block the flow or show “You’ve already used 2 trials” and do not attempt to create a trial subscription.

---

## 7. How to handle the trial limit error

When your app **inserts** into **`public.subscriptions`** with **`plan_id = 'trial'`** (or **`plan = 'trial'`**):

- The trigger may **raise** **`Trial limit reached (max 2 per account).`**
- **Catch** this error (e.g. from Supabase client or API response) and:
  - Return a **403** or **400** with a clear message, e.g. **“Trial limit reached (max 2 per account).”**
  - Do **not** create the subscription; the INSERT will have been rolled back.

---

## 8. Optional security improvements

- **Strict IP/User-Agent:** Use **`validateSession(..., { strictIp: true, strictUserAgent: true })`** on sensitive routes (may increase support load if users change networks/devices often).
- **Refresh `last_activity_at`:** Optionally update **`user_sessions.last_activity_at`** on each validated request to implement idle timeout or “last active” display.
- **Log mismatches:** When **token mismatch** or IP/UA mismatch occurs, log for security review before forcing re-login.

---

## 9. Deployment checklist

Use this list when deploying or verifying the system:

- [ ] **Migration executed**  
  The file **`supabase/migrations/20260310000000_user_sessions_and_trial_limit.sql`** has been run in the Supabase SQL Editor (or via CLI).

- [ ] **`user_sessions` table exists**  
  In Supabase Table Editor, **`public.user_sessions`** exists with columns: **`user_id`**, **`session_token`**, **`ip_address`**, **`user_agent`**, **`created_at`**, **`last_activity_at`**.

- [ ] **`replace_user_session` function exists**  
  In Supabase SQL Editor, **`SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'replace_user_session';`** returns one row.

- [ ] **Trigger `enforce_trial_limit` exists**  
  In Supabase, **`SELECT tgname FROM pg_trigger WHERE tgname = 'enforce_trial_limit';`** returns one row (on **`public.subscriptions`**).

- [ ] **Register-session API implemented**  
  **`POST /api/register-session`** (login app) is implemented and called after **`signInWithPassword()`** on the login page.

- [ ] **Can-start-trial API implemented**  
  **`GET /api/can-start-trial`** (login app) is implemented and returns **`canStartTrial`** and **`trialCount`**; optional: used before starting the trial flow.

- [ ] **Session validation in use**  
  Protected APIs (e.g. **`GET /api/membership-status`**) use **`validateSession()`** and return **401** when the session is invalid (no row or token mismatch).

- [ ] **Trial insert error handled**  
  The code path that inserts into **`subscriptions`** with **`plan_id = 'trial'`** (or **`plan = 'trial'`**) catches the database error and shows **“Trial limit reached (max 2 per account).”**

---

## 10. Files reference

| Item | Purpose |
|------|--------|
| **`supabase/migrations/20260310000000_user_sessions_and_trial_limit.sql`** | Run once in Supabase: creates **`user_sessions`**, updates **`profiles`**, trigger **`enforce_trial_limit`**, function **`replace_user_session`**. |
| **`apps/login/app/api/register-session/route.ts`** | **POST**: registers session (token, IP, User-Agent) after login. |
| **`apps/login/app/api/can-start-trial/route.ts`** | **GET**: returns **`canStartTrial`** and **`trialCount`**. |
| **`apps/login/lib/validateSession.ts`** | **`validateSession(supabase, request, options?)`**: token reuse protection and optional IP/User-Agent matching. |
| **Login page** | After **`signInWithPassword()`** success, calls **`POST /api/register-session`**. |
| **`apps/login/app/api/membership-status/route.ts`** | Example protected route using **`validateSession()`**; returns **401** if session invalid. |
