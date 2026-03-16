# V2 feature flag (Phase 1)

Advisory v2 behaviour (persona header, plan gating, saved reports, advisory_v2 saves) is gated by:

- **`NEXT_PUBLIC_USE_V2=1`** — when set, platform dashboard and model apps use the new header, tiles gating, and advisory_v2 session/report helpers.

**Toggle in deployment (e.g. Vercel):**

- Environment variables → add or edit `NEXT_PUBLIC_USE_V2` → set to `1` to enable, or leave unset/empty for legacy behaviour.
- Redeploy so the client bundle picks up the value.
