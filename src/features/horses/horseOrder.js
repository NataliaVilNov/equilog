// Stable-sorts horses by their shared sortOrder — used by both HorseListPage (the main
// horse list) and WeeklyBoardGrid (the board's row order), so reordering horses via either
// feature is reflected everywhere. Horses without a sortOrder tie at the end, in their
// existing array order — this preserves every existing stable's current order until someone
// explicitly reorders (Array.prototype.sort is stable, so ties keep their relative order).
export function sortHorsesByOrder(horses) {
  return [...(horses || [])].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
}
