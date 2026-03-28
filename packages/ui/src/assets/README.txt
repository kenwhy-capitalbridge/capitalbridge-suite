Canonical brand SVGs (source of truth for the monorepo)

Files:
- CapitalBridgeLogo_Gold.svg — wordmark for dark green headers (#0D3A1D).
- CapitalBridgeLogo_Green.svg — alternate where a green-tinted mark is needed.
- lionhead_Gold.svg — Lion’s Verdict / report lion mark (gold).
- lionhead_Green.svg — alternate lion mark (green).

After editing any file here, run from repo root:
  node scripts/sync-brand-assets.mjs

That copies these into apps/*/public/brand/ so /brand/*.svg works in every app (login, platform, models, PDF fetch).

React: import paths from @cb/ui (brandPaths) or use /brand/... in img src.
