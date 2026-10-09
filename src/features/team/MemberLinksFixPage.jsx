import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebaseClient.js";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { EmptyState } from "../../components/EmptyState.jsx";

// Pantalla de administrador, de un solo uso por cuadra: crea el documento puente
// memberLinks/{uid} para los miembros que ya se vincularon antes de que el puente existiera.
//
// Sin puente, firestore.rules no encuentra la ficha de equipo de esa persona y le aplica los
// permisos por defecto (horses, trainings, tasks, expenses, health) en vez de los que tiene
// configurados. Con puente, mandan los configurados — que para alguien restringido puede
// significar perder accesos que hoy tiene de facto. Es el objetivo, pero conviene saberlo
// antes de pulsar.
export function MemberLinksFixPage() {
  const navigate = useNavigate();
  const { stableId, team } = useStableData();
  const { isAdmin } = usePermissions();
  const { showToast } = useToast();
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return <EmptyState icon="🔒">Solo un administrador puede reparar los vínculos.</EmptyState>;
  }

  // Miembros ya vinculados a una cuenta: son los únicos que necesitan puente.
  const linked = (team || [])
    .map((m) => ({ ...m, linkUid: m.uid || m.userId || m.authUid }))
    .filter((m) => m.linkUid);

  async function loadExisting() {
    setBusy(true);
    try {
      const snap = await getDocs(collection(db, "stables", stableId, "memberLinks"));
      setExisting(snap.docs.map((d) => d.id));
    } catch (e) {
      showToast("No se pudo leer: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function fixOne(member) {
    setBusy(true);
    try {
      await setDoc(doc(db, "stables", stableId, "memberLinks", member.linkUid), {
        teamMemberId: member.id,
        uid: member.linkUid,
        email: member.email || "",
        linkedAt: member.linkedAt || new Date().toISOString(),
      });
      showToast("Puente creado para " + (member.name || "el miembro"));
      await loadExisting();
    } catch (e) {
      showToast("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(-1)} aria-label="Volver">
          ←
        </button>
        <h1>Reparar permisos</h1>
      </div>

      <div className="board-help info">
        <b>Qué hace esto</b>
        <span>
          Conecta la cuenta de cada miembro con su ficha de equipo para que los permisos que le
          has configurado se apliquen de verdad, y no solo en pantalla. Hazlo de uno en uno y
          comprueba después que esa persona sigue pudiendo trabajar.
        </span>
      </div>

      <button className="btn btg btbl" disabled={busy} onClick={loadExisting}>
        {existing === null ? "Ver qué hay ahora" : "Actualizar"}
      </button>

      {existing !== null && (
        <div className="config-list" style={{ marginTop: ".9rem" }}>
          {!linked.length && (
            <p style={{ fontSize: ".82rem", opacity: 0.7 }}>
              Nadie del equipo está vinculado a una cuenta todavía.
            </p>
          )}
          {linked.map((m) => {
            const done = existing.includes(m.linkUid);
            return (
              <div className="config-row" key={m.id}>
                <span className="config-code ba-blue">{(m.name || "?").charAt(0)}</span>
                <div>
                  <b>{m.name || "Sin nombre"}</b>
                  <small>{done ? "Ya conectado" : "Pendiente"}</small>
                </div>
                <button
                  className={"btn btsm " + (done ? "btg" : "bts")}
                  disabled={busy}
                  onClick={() => fixOne(m)}
                >
                  {done ? "Rehacer" : "Conectar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}