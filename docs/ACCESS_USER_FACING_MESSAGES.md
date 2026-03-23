# Auth & access copy (single source)

All tiered calm messages and shared UI strings live in:

**`apps/login/lib/sanitizeAuthErrorMessage.ts`**

Use **`resolveCalmAuthMessage(kind, attempt, raw?)`** — never show `raw` in the UI. Increment **`attempt`** on each failure for that flow; reset on success.

## Tier kinds

`link` · `resend` · `password` · `email_change` · `network` · `rate_limit` · `login`

## UI helpers

- **`CalmAuthMessage`** — renders text and linkifies `admin@thecapitalbridge.com`
- **`AuthHelpFooter`** — minimal layout footer (support copy lives in each card)

## Pages

| File | Notes |
|------|--------|
| `app/access/page.tsx` | Link / login / set-password / error views; attempt refs per flow |
| `app/forgot-password/page.tsx` | Resend tiering |
| `components/RegisteredEmailChangeForm.tsx` | Email-change tiering |

## Button labels (resend)

`apps/login/lib/resendAccessEmail.ts` — cooldown label + **Send Me A New Link**
