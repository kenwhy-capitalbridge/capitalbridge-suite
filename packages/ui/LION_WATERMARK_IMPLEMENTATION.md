# Lion head watermark (model apps)

## What you see

Several copies of the gold lion SVG sit **fixed** to the viewport, **low opacity** (~3–7%), **rotated** at different angles, and **spread** so they read as a soft watermark—not a single hero image. They sit **behind** all app UI and ignore pointer events.

## Source asset

- **Canonical file:** `packages/ui/src/assets/lionhead_Gold.svg`
- **Served in apps as:** `/brand/lionhead_Gold.svg` (kept in sync via `scripts/sync-brand-assets.mjs`)
- **URL constant:** `BRAND_LIONHEAD_GOLD` in `packages/ui/src/brandPaths.ts`

## Code

| Piece | Role |
|--------|------|
| `packages/ui/src/LionWatermarkBackdrop.tsx` | Renders the scattered `<img>` marks; edit `LION_WATERMARK_MARKS` to move, resize, or fade lions. |
| Model app `app/layout.tsx` | Renders `<LionWatermarkBackdrop />` first in `<body>`, then wraps the rest in `<div className="relative z-[1] min-h-screen">…</div>`. |

### Why the `z-[1]` wrapper?

A `position: fixed` element with `z-index: 0` is painted **on top of** normal in-flow content in the usual stacking rules. The wrapper creates a sibling stacking layer above `z-0` so the real app stays visible while the watermark stays behind it.

### Why not random JS?

True random placement needs client-only layout and can flash on load. Fixed positions in `LION_WATERMARK_MARKS` give a consistent, subtle scatter with no hydration issues.

## Layout snippet (copy pattern)

```tsx
<body>
  <LionWatermarkBackdrop />
  <div className="relative z-[1] min-h-screen">
    <ModelSaveHandlersProvider>
      <ModelAppHeader … />
      {children}
    </ModelSaveHandlersProvider>
  </div>
</body>
```

## Tuning

- **Stronger hint:** raise `opacity` on each mark (cap ~0.05 so it stays a watermark; defaults are ~0.012–0.026).
- **Softer:** lower opacity or remove a mark.
- **Less busy:** delete entries from `LION_WATERMARK_MARKS`.
- **Print:** the root uses `print:hidden` so PDFs/print routes are not tiled with lions unless you remove that class.

## Apps wired

Forever, Income Engineering, Capital Health, and Capital Stress model layouts import `LionWatermarkBackdrop` from `@cb/ui` and use the pattern above.
