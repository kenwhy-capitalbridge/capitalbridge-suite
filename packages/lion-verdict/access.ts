export type LionAccessUser = {
  isPaid: boolean;
  hasActiveTrialUpgrade: boolean;
};

export function canAccessLion(user: LionAccessUser | null | undefined): boolean {
  if (!user) return false;
  return user.isPaid === true || user.hasActiveTrialUpgrade === true;
}
