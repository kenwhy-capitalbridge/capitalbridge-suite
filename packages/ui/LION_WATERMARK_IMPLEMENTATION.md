# Lion head watermark (model apps)

## What you see

Several copies of the gold lion SVG sit **fixed** to the viewport, **low opacity**, **rotated** at different angles, and **spread** so they read as a soft watermark—not a single hero image. They sit **behind** all app UI and ignore pointer events.

## Source asset

- **Canonical file:** `packages/ui/src/assets/lionhead_Gold.svg`
- **Served in apps as:** `/brand/lionhead_Gold.svg` (kept in sync via `scripts/sync-brand-assets.mjs`)
- **URL constant:** `BRAND_LIONHEAD_GOLD` in `packages/ui/src/brandPaths.ts`

## Code

| Piece | Role |
|--------|------|
| `packages/ui/src/LionWatermarkBackdrop.tsx` | Renders the scattered `<img>` marks; edit `LION_WATERMARK_MARKS` to move, resize, or fade lions. |
| Forever, Income Engineering, Capital Health, Capital Stress `app/layout.tsx` | Renders `<LionWatermarkBackdrop />` first in `<body>`, then wraps the rest in `<div className="relative min-h-screen">…</div>` (no z-index on the shell). **Not** used on login (access, pricing, etc.) or platform (dashboard, profile, …). |

### Stacking (`z-index`)

The backdrop uses **`z-[100]`** and sits **below** `ModelAppHeader` (**`z-index: 200`**). Legacy calculator roots use a **transparent** full-page background so `body`’s green and the lions show in the gutters; cards keep their own backgrounds.

### Why not random JS?

True random placement needs client-only layout and can flash on load. Fixed positions in `LION_WATERMARK_MARKS` give a consistent, subtle scatter with no hydration issues.

## Layout snippet (copy pattern)

```tsx
<body>
  <LionWatermarkBackdrop />
  <div className="relative min-h-screen">
    <ModelSaveHandlersProvider>
      <ModelAppHeader … />
      {children}
    </ModelSaveHandlersProvider>
  </div>
</body>
```

## Tuning

- **Stronger hint:** raise `opacity` on each mark (cap ~0.05 so it stays a watermark; defaults are ~0.01–0.018 with larger tiles).
- **Softer:** lower opacity or remove a mark.
- **Less busy:** delete entries from `LION_WATERMARK_MARKS`.
- **Print:** the root uses `print:hidden` so PDFs/print routes are not tiled with lions unless you remove that class.

## Apps wired

Forever, Income Engineering, Capital Health, and Capital Stress model layouts import `LionWatermarkBackdrop` from `@cb/ui` and use the pattern above.
