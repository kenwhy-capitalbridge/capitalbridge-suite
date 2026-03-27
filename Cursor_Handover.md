# Cursor handover

**Generated:** 2026-03-27 19:50 UTC  
**For:** New chat session (prior thread too long / laggy)

---

## PASTE CONTEXT AND SUMMARY HERE

### Where we left off

1. **Git / deploy:** `main` was **clean** and **already pushed** (`git push` → *Everything up-to-date*). Latest tip on `origin/main` was **`9bc6023`** (*fix: trial Income Eng crash, Back URL fallback, LionVerdict progress*). Vercel should build from `main`; if stale, redeploy from dashboard.
2. **Agreed next work (user order):**  
   - **Phase A — UI/UX** (do this first).  
   - **Phase B — PDF** after UI: align PDF with **Capital Bridge Advisory Framework** flow/template (three pillars: *Evaluate Sustainability → Engineer Capital → Stress Test Resilience*; modules Forever / Income Engineering, Capital Health, Capital Stress). Reference asset: `assets/Capital_Bridge_Framework-725bc425-8030-4e01-8f8a-1c34e767cf0e.png` (also under `.cursor/projects/.../assets/`).
3. **Lion’s Verdict (trial vs paid):** `packages/lion-verdict/access.ts` — `canAccessLion(user)` is true only if `isPaid` or `hasActiveTrialUpgrade`. **Trial** → **`LionVerdictLocked`** (headers, tier label, teaser copy, “hidden analysis” bullets, unlock CTA — **not** personalized `getLionVerdict` / `LionVerdictActive` body). **Paid** (or active trial upgrade) → **`LionVerdictActive`** + copy panel. **Capital Health / Stress** also use plan entitlements (`canSeeVerdict`, etc.) for some score labeling vs generic labels.
4. **Known follow-up (optional):** `LionVerdictLocked` unlock control is `type="button"` with **no** `onClick`/href unless wired elsewhere — product may want a real link to pricing/subscribe.

### Recent fixes already on `main` (context only)

- Trial **Income Engineering** print path: avoid using `lionReport` when null (conditional / upgrade message).
- **Back** to platform: `packages/shared/src/urls.ts` — `envUrl` treats empty `NEXT_PUBLIC_PLATFORM_APP_URL` as unset (fallback behavior).
- **Capital Health / Stress dashboards:** pass `lionAccessUser` into legacy app (fixed `ReferenceError`).
- **`LionVerdictActive`:** destructure / props including `progress`; related TS fixes in `getLionVerdict`.

### Useful paths

- Lion: `packages/lion-verdict/` (`access.ts`, `LionVerdictLocked.tsx`, `LionVerdictActive.tsx`, `getLionVerdict.ts`, `copy.ts`)
- Apps: `apps/*/legacy/App.tsx`, dashboard clients under `apps/capitalhealth/app/dashboard/`, `apps/capitalstress/...`
- Shared URLs: `packages/shared/src/urls.ts`
- Other handover notes may exist: `gpthandover.md`, `Cursor-handover.txt`

### Assumptions

- Context above matches repo state unless the user has new local commits.
- If `origin/main` has moved, verify latest SHA and Vercel deployment.

---

## Your role (next assistant)

- **Pick up** at **Phase A: UI/UX**; defer **PDF framework alignment** until after UI unless the user redirects.
- **No long recap** of Lion access rules unless the user asks.
- **Be concise and action-oriented.** If requirements for UI or PDF are ambiguous, **ask targeted questions** instead of guessing.
- **No response required** from the assistant until the user gives further instructions (user preference for how the new session should start).
