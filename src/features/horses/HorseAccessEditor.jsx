// Admin-only editor for a horse's allowedUids (see horseAccess.js). Only team members who've
// already linked their account (have a resolvable uid/userId/authUid — usePermissions.js's
// matching logic) can be granted access, since Firestore rules match on auth uid, not team
// doc id; an unlinked member is shown disabled with an explanatory note.
export function HorseAccessEditor({ team, restricted, onRestrictedChange, allowedUids, onAllowedUidsChange }) {
  function toggleMember(mUid) {
    onAllowedUidsChange(
      allowedUids.includes(mUid) ? allowedUids.filter((u) => u !== mUid) : [...allowedUids, mUid]
    );
  }

  return (
    <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem" }}>
      <div
        style={{
          fontSize: ".7rem",
          fontWeight: 700,
          color: "var(--gr)",
          textTransform: "uppercase",
          letterSpacing: ".07em",
          marginBottom: ".6rem",
        }}
      >
        🔒 Acceso
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".86rem" }}>
        <input
          type="checkbox"
          checked={restricted}
          onChange={(e) => onRestrictedChange(e.target.checked)}
          style={{ width: "auto" }}
        />
        Restringir el acceso a este caballo
      </label>
      {restricted && (
        <>
          <p style={{ fontSize: ".72rem", color: "var(--gr)", margin: ".5rem 0" }}>
            Solo administradores y las personas marcadas abajo podrán ver y editar la información y los gastos de
            este caballo.
          </p>
          {team.map((m) => {
            const mUid = m.uid || m.userId || m.authUid;
            const linked = !!mUid;
            return (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  fontSize: ".82rem",
                  opacity: linked ? 1 : 0.5,
                  marginBottom: ".4rem",
                }}
              >
                <input
                  type="checkbox"
                  disabled={!linked}
                  checked={linked && allowedUids.includes(mUid)}
                  onChange={() => toggleMember(mUid)}
                  style={{ width: "auto" }}
                />
                <span>
                  {m.emoji || "👤"} {m.name}
                  {!linked && <small> — aún no ha vinculado su cuenta</small>}
                </span>
              </label>
            );
          })}
        </>
      )}
    </div>
  );
}
