# Cursor handover

**Generated:** 2026-03-28 (session close)  
**For:** New chat session / continuity

---

## Locked restore point

| | |
|---|---|
| **Tag** | `restore-point-2026-03-28` |
| **Commit** | `eee0b61` — *fix(ui): center ChromeSpinnerGlyph and restore reliable rotation* |
| **Full SHA** | `eee0b61e52b2b275176d903f66a50432c06d3aa0` |

**Return to this state:**

```bash
git fetch origin
git checkout restore-point-2026-03-28
# or: git checkout eee0b61
```

**Create the tag locally** (if you clone fresh and the tag is missing):

```bash
git tag -a restore-point-2026-03-28 eee0b61 -m "Restore: spinner UX + layout fixes locked"
```

The tag should exist on **`origin`** after push from this session. *(This tag name was moved from an older snapshot to **`eee0b61`** so it reflects the spinner / pending-button UX work; if you need the prior pointer, use commit **`228250a`.)*

---

## Where we left off

1. **Git / deploy:** `main` at **`eee0b61`**; pending-button UX and **ChromeSpinnerGlyph** layout/animation work are merged and intended to be on **`origin/main`**. Vercel builds from `main` unless overridden.

2. **UI/UX — pending controls (done in this arc):** Consistent pattern: **click → label hidden → spinner only inside control → disabled while loading**. Applied across platform (header, profile, dashboard tiles), login/auth flows, `@cb/ui` chrome, Capital Stress run CTA, advisory save button, etc.

3. **ChromeSpinnerGlyph:** Rotation uses **CSS keyframes** on `.cb-spinner-glyph-spin` (not SMIL). Shared wrapper **`.cb-pending-btn-inner`** (in `cb-model-base.css`) centers the glyph when paired with `.cb-visually-hidden` text. Header grid uses **`minmax(4.5rem, 1fr)`** on the right column so LOGIN/auth does not collapse. **`ChromePendingNavLink`** uses `display: inline-flex` when pending.

4. **Agreed next work (from earlier plan — confirm with user):**  
   - **Phase A — UI/UX:** further polish only if needed.  
   - **Phase B — PDF:** align PDF with **Capital Bridge Advisory Framework** (three pillars; modules Forever / Income Engineering, Capital Health, Capital Stress). Reference: `assets/Capital_Bridge_Framework-725bc425-8030-4e01-8f8a-1c34e767cf0e.png`.

5. **Lion’s Verdict (trial vs paid):** `packages/lion-verdict/access.ts` — `canAccessLion(user)` is true only if `isPaid` or `hasActiveTrialUpgrade`. **Trial** → **`LionVerdictLocked`**; **paid** (or active trial upgrade) → **`LionVerdictActive`** + copy panel. Capital Health / Stress use plan entitlements for some score labeling.

6. **Known follow-up (optional):** `LionVerdictLocked` unlock control may still need a real pricing/subscribe link if product wants it.

---

## Useful paths

- Spinner / chrome: `packages/ui/src/ChromeSpinnerGlyph.tsx`, `ChromePendingNavLink.tsx`, `cb-model-base.css` (`.cb-pending-btn-inner`, `.cb-spinner-glyph-spin`)
- Platform: `apps/platform/app/components/` (login, logout, profile, `PlatformFrameworkHeader.tsx`)
- Login: `apps/login/` (auth buttons use `ButtonSpinner` + `cb-visually-hidden` where aligned)
- Lion: `packages/lion-verdict/`
- Other notes: `gpthandover.md`

---

## Your role (next assistant)

- **Verify** `origin/main` (or the tag) matches expectations before large changes.
- **Be concise and action-oriented.** Ask targeted questions if PDF or UI scope is unclear.
- **No response required** until the user gives further instructions (user preference for how a new session may start).
