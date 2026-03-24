/**
 * Re-export shared activation logic (single source of truth).
 */
export {
  activateMembershipFromPaidBillingSession,
  ensurePaidMembershipForUser,
  type ActivateMembershipResult,
} from "@cb/membership/activateFromBillingSession";
