/**
 * Font stacks aligned with `packages/ui/src/cb-model-base.css` (Inter + Roboto Serif).
 * Body rhythm uses `--cb-body-font-size` / `--cb-body-line-height` there; Tailwind `text-cb-body` in model apps.
 * Use these constants in inline print/PDF HTML where CSS variables are awkward.
 */
export const CB_FONT_SANS =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const CB_FONT_SERIF = '"Roboto Serif", Georgia, "Noto Serif", "Times New Roman", serif';
