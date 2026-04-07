import { planSlugDeniesLionsVerdict } from "@cb/shared/plans";

export type LionAccessUser = {
  isPaid: boolean;
  hasActiveTrialUpgrade: boolean;
};

export { planSlugDeniesLionsVerdict };

export function lionAccessUserFromPlanSlug(slug: string | null | undefined): LionAccessUser {
  return {
    isPaid: !planSlugDeniesLionsVerdict(slug),
    hasActiveTrialUpgrade: false,
  };
}

export function canAccessLion(user: LionAccessUser | null | undefined): boolean {
  if (!user) return false;
  return user.isPaid === true || user.hasActiveTrialUpgrade === true;
}
