/**
 * Shared UI components for Capital Bridge apps.
 * Extend with buttons, cards, forms, etc. as needed.
 */
export { ModelAppHeader, type ModelAppHeaderProps } from "./ModelAppHeader";
export { CapitalBridgeLogoText, type CapitalBridgeLogoTextProps } from "./CapitalBridgeLogoText";
export {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_CAPITAL_BRIDGE_LOGO_GREEN,
  BRAND_LIONHEAD_GOLD,
  BRAND_LIONHEAD_GREEN,
} from "./brandPaths";
export { LionWatermarkBackdrop } from "./LionWatermarkBackdrop";
export { LionWatermarkShell } from "./LionWatermarkShell";
export {
  LionWatermarkDynamicsProvider,
  LionWatermarkStateSync,
  useLionWatermarkDynamics,
  useSetLionWatermarkDynamics,
  type LionWatermarkDynamics,
} from "./lionWatermarkDynamics";
