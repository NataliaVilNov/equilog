import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { canViewHorseInfo } from "../horseAccess.js";
import { fD } from "../../../lib/date.js";

// Ports the header portion of rHorse (public/legacy-app.js:1674-1690).
export function HorseHeader({ horse }) {
  const { can, isAdmin, uid } = usePermissions();
  const authorized = canViewHorseInfo(horse, isAdmin, uid);
  const navigate = useNavigate();
  const owners =
    horse.owners && horse.owners.length
      ? horse.owners
      : horse.owner
      ? [{ nombre: horse.owner, pct: 100 }]
      : [];

  return (
    <>
      <div className="vh">
        <button className="ib" onClick={() => navigate("/horses")}>
          ←
        </button>
        <h1>{horse.name}</h1>
        <div className="vhr">
          {can("horses") && authorized && (
            <button className="ib" onClick={() => navigate(`/horses/${horse.id}/edit`)}>
              ✏️
            </button>
          )}
          {can("reports") && (
            <button className="ib" onClick={() => navigate(`/horses/${horse.id}/report`)}>
              📄
            </button>
          )}
        </div>
      </div>
      <div className="hh">
        <div className="pl">{horse.photo ? <img src={horse.photo.url} alt="" /> : "🐴"}</div>
        <div style={{ minWidth: 0 }}>
          {!authorized && (
            <div className="ml2" style={{ color: "var(--gr)" }}>
              🔒 Información restringida
            </div>
          )}
          {authorized && owners.length > 0 && (
            <div className="ml2">
              <b>Prop:</b>{" "}
              {owners.length === 1
                ? `${owners[0].nombre || ""}${owners[0].pct < 100 ? ` (${owners[0].pct}%)` : ""}`
                : owners.map((o) => `${o.nombre || ""} ${o.pct}%`).join(" · ")}
            </div>
          )}
          {authorized && horse.breed && (
            <div className="ml2">
              <b>Raza:</b> {horse.breed}
            </div>
          )}
          {authorized && horse.origin && (
            <div className="ml2">
              <b>Procedencia:</b> {horse.origin}
            </div>
          )}
          {authorized && horse.dob && (
            <div className="ml2">
              <b>Nac:</b> {fD(horse.dob)}
            </div>
          )}
          {authorized && horse.notes && (
            <div className="ml2" style={{ color: "var(--gr)" }}>
              {horse.notes}
            </div>
          )}
          {authorized && (horse.sire || horse.dam) && (
            <div className="ml2" style={{ marginTop: ".3rem" }}>
              <b>Padre:</b> {horse.sire || "—"} &nbsp;·&nbsp; <b>Madre:</b> {horse.dam || "—"}
            </div>
          )}
          {authorized && (horse.gsire || horse.gdam) && (
            <div className="ml2">
              <b>Ab. pat.:</b> {horse.gsire || "—"} &nbsp;·&nbsp; {horse.gdam || "—"}
            </div>
          )}
          {authorized && (horse.mgsire || horse.mgdam) && (
            <div className="ml2">
              <b>Ab. mat.:</b> {horse.mgsire || "—"} &nbsp;·&nbsp; {horse.mgdam || "—"}
            </div>
          )}
          {authorized && horse.horsetelex && (
            <div style={{ marginTop: ".4rem" }}>
              <a
                href={horse.horsetelex}
                target="_blank"
                rel="noopener"
                className="btn btsm"
                style={{ fontSize: ".62rem" }}
              >
                🔗 Ver en Horsetelex
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
