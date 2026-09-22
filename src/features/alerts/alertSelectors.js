import { dU } from "../../lib/date.js";
import { healthTypeById } from "../../lib/constants.js";

// Ports sanA/sesA (public/legacy-app.js:1034-1041), renamed to describe what they return,
// plus visibleAlertsForUser (public/legacy-app.js:695-699) as an explicit-param pure
// function instead of one reading isStableAdmin()/myTeamMemberId() globals.

export function upcomingHealthAlerts(health, horses) {
  return (health || [])
    .filter((r) => r.nxt)
    .flatMap((r) => {
      const dy = dU(r.nxt);
      const h = horses.find((x) => x.id === r.hid);
      if (!h || dy > 14) return [];
      return [
        { hid: r.hid, hn: h.name, type: r.type, label: r.label || healthTypeById(r.type).l, nxt: r.nxt, days: dy, ov: dy < 0 },
      ];
    })
    .sort((a, b) => a.days - b.days);
}

export function pendingSessionAlerts(salerts) {
  return (salerts || []).filter((s) => !s.ans);
}

export function visibleAlertsForUser(alerts, isAdmin, myTeamMemberId) {
  if (isAdmin) return alerts;
  return (alerts || []).filter((a) => myTeamMemberId && a.pid === myTeamMemberId);
}
