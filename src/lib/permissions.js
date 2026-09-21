export const PERMISSION_KEYS = [
  "horses",
  "trainings",
  "tasks",
  "expenses",
  "health",
  "reports",
  "stats",
  "team",
  "stable",
  "sale",
  "deleteItems",
];

export function defaultTeamPermissions() {
  return {
    horses: true,
    trainings: true,
    tasks: true,
    expenses: true,
    health: true,
    reports: false,
    stats: false,
    team: false,
    stable: false,
    sale: false,
    deleteItems: false,
  };
}

export function fullPermissions() {
  return PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

export function canManageStable(stable, user) {
  if (!stable || !user) return false;
  const member = stable.members && stable.members[user.uid];
  return stable.ownerId === user.uid || (member && member.role === "admin");
}
