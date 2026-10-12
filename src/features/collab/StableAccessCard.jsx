import { useState } from "react";
import { useAccessHorses } from "./useAccessHorses.js";
import { CollabHorseSheet } from "./CollabHorseSheet.jsx";

export function StableAccessCard({ access, typeLabel }) {
  const { horses, loading } = useAccessHorses(access.stableId, access.horseIds);
  const [openHid, setOpenHid] = useState(null);

  const openHorse = horses.find((h) => h.id === openHid);

  return (
    <div className="card" style={{ padding: ".85rem", marginBottom: ".75rem" }}>
      <div style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--vd)" }}>
        {access.stableName || "Cuadra"}
      </div>
      <div style={{ fontSize: ".74rem", color: "var(--gr)", marginBottom: ".6rem" }}>
        {typeLabel} · {(access.horseIds || []).length} caballo
        {(access.horseIds || []).length !== 1 ? "s" : ""}
      </div>

      {loading && <div style={{ fontSize: ".8rem", color: "var(--gr)" }}>Cargando…</div>}

      {horses.map((h) => (
        <button
          key={h.id}
          onClick={() => setOpenHid(h.id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: ".6rem",
            background: "none",
            border: "1px solid var(--li)",
            borderRadius: "12px",
            padding: ".6rem .75rem",
            marginBottom: ".3rem",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span className="av" style={{ flexShrink: 0 }}>
            {h.photo ? <img src={h.photo.url} alt="" /> : "🐴"}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: ".88rem", color: "var(--ti)" }}>
              {h.name}
            </span>
            <span style={{ display: "block", fontSize: ".72rem", color: "var(--gr)" }}>
              {[h.breed, h.sex, h.birth].filter(Boolean).join(" · ") || "Sin datos"}
            </span>
          </span>
          <span style={{ color: "var(--v)", fontSize: "1.1rem", flexShrink: 0 }}>→</span>
        </button>
      ))}

      {openHorse && (
        <CollabHorseSheet
          stableId={access.stableId}
          horse={openHorse}
          canEdit={access.type === "vet"}
          onClose={() => setOpenHid(null)}
        />
      )}
    </div>
  );
}