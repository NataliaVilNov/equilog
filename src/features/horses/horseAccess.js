// A horse's profile info and expenses can be restricted to specific team members (plus
// admins, always). `allowedUids` absent/null means "legacy/unrestricted" — every horse
// created before this feature shipped has no such field, and must keep working exactly as
// before (visible/editable by any member with the `horses` permission) rather than being
// silently locked down the moment this ships. Only once `allowedUids` is an actual array does
// a horse become restricted. See docs/components/horses.md.
export function isHorseRestricted(horse) {
  return Array.isArray(horse && horse.allowedUids);
}

export function canViewHorseInfo(horse, isAdmin, uid) {
  if (isAdmin) return true;
  if (!isHorseRestricted(horse)) return true;
  return !!uid && horse.allowedUids.includes(uid);
}
