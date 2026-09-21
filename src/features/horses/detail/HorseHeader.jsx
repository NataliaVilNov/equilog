import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { fD } from "../../../lib/date.js";

// Ports the header portion of rHorse (public/legacy-app.js:1674-1690).
export function HorseHeader({ horse }) {
  const { can } = usePermissions();
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
          {can("horses") && (
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
        <div className="pl">{horse.photo ? <img src={horse.photo} alt="" /> : "🐴"}</div>
        <div style={{ minWidth: 0 }}>
          {owners.length > 0 && (
            <div className="ml2">
              <b>Prop:</b>{" "}
              {owners.length === 1
                ? `${owners[0].nombre || ""}${owners[0].pct < 100 ? ` (${owners[0].pct}%)` : ""}`
                : owners.map((o) => `${o.nombre || ""} ${o.pct}%`).join(" · ")}
            </div>
          )}
          {horse.breed && (
            <div className="ml2">
              <b>Raza:</b> {horse.breed}
            </div>
          )}
          {horse.origin && (
            <div className="ml2">
              <b>Procedencia:</b> {horse.origin}
            </div>
          )}
          {horse.dob && (
            <div className="ml2">
              <b>Nac:</b> {fD(horse.dob)}
            </div>
          )}
          {horse.notes && (
            <div className="ml2" style={{ color: "var(--gr)" }}>
              {horse.notes}
            </div>
          )}
          {(horse.sire || horse.dam) && (
            <div className="ml2" style={{ marginTop: ".3rem" }}>
              <b>Padre:</b> {horse.sire || "—"} &nbsp;·&nbsp; <b>Madre:</b> {horse.dam || "—"}
            </div>
          )}
          {(horse.gsire || horse.gdam) && (
            <div className="ml2">
              <b>Ab. pat.:</b> {horse.gsire || "—"} &nbsp;·&nbsp; {horse.gdam || "—"}
            </div>
          )}
          {(horse.mgsire || horse.mgdam) && (
            <div className="ml2">
              <b>Ab. mat.:</b> {horse.mgsire || "—"} &nbsp;·&nbsp; {horse.mgdam || "—"}
            </div>
          )}
          {horse.horsetelex && (
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
