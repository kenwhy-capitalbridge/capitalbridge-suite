# Admin billing email recovery (support)

When a customer paid with the wrong email and **cannot** use the self-serve flow on the payment-return page, support can reassign the paid `bill_id` to the correct address via the API.

## Prerequisites

1. Run the Supabase migration that creates `public.admin_billing_email_recoveries`.
2. Set **`BILLING_ADMIN_RECOVERY_SECRET`** on the **API** Vercel project (or local `.env`): at least **32 characters**, random. This is **not** the Supabase service role key.
3. Ensure **`LOGIN_APP_URL`** / **`NEXT_PUBLIC_LOGIN_APP_URL`** is set so the password-setup email redirects to `/access`.

## Endpoint

`POST https://api.thecapitalbridge.com/billing/admin/recover-email`

### Headers

- `Authorization: Bearer <BILLING_ADMIN_RECOVERY_SECRET>`
- `Content-Type: application/json`

### Body

```json
{
  "bill_id": "Billplz bill id from the customer",
  "new_email": "corrected@example.com",
  "performed_by": "optional: agent email or ticket id (stored in audit row)"
}
```

### Validation (summary)

- `billing_sessions.bill_id` exists  
- Session **`status === 'paid'`**  
- **`membership_id`** and **`user_id`** present  
- Membership row exists and matches session (same checks as user self-recovery)  
- If a **`payments`** row exists for that `billplz_bill_id`, it must be **`paid`** and linked to the same membership  

### Behaviour

- Moves the membership to the auth user for `new_email` (creates the user if needed).  
- Updates `billing_sessions`, `payments.user_id` (when a payment row exists), and `profiles`.  
- Sends the same **password / set-password** email as post-payment onboarding (`resetPasswordForEmail` + HTTP fallback).  

### Responses

- **`200`** `{ "ok": true, "bill_id", "old_email", "new_email", "idempotent"?: boolean }`  
- **`4xx/5xx`** `{ "error": "code", "message"?: "..." }` (e.g. `session_not_found`, `payment_not_confirmed`, `unauthorized`)

## Audit trail

1. **Database:** every call (success or denied) appends a row to **`admin_billing_email_recoveries`** with `bill_id`, old/new emails, user ids when known, `status` (`completed` | `denied`), `error_code`, `performed_by_actor`, `client_ip`, `created_at`.  
2. **Logs:** structured JSON lines with prefix event `admin_billing_email_recovery` and `outcome`: `completed` | `denied`.

Query examples (SQL):

```sql
select * from public.admin_billing_email_recoveries
where bill_id = '...'
order by created_at desc;
```

## Security

- Treat the bearer secret like a production password: only support tooling or scripts with restricted access.  
- Do **not** expose this endpoint in the browser or embed the secret in client apps.  
- Wrong secret → **`401`**; secret not configured → **`503`**.  
- **Rate limiting:** in-process limit of **45 requests per client IP per hour** on this route (returns **`429`**). Not a substitute for a strong secret; use Redis/KV for global limits if needed.

## Example (curl)

```bash
curl -sS -X POST "$API_URL/billing/admin/recover-email" \
  -H "Authorization: Bearer $BILLING_ADMIN_RECOVERY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"bill_id":"YOUR_BILL_ID","new_email":"user@example.com","performed_by":"ticket-12345"}'
```
