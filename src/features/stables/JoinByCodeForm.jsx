import { useContext, useState } from "react";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { useCollaborators } from "../../contexts/CollaboratorsContext.jsx";

// Ports the invite-code input + joinByCode() (index.html:54-60, public/legacy-app.js:496-559).
//
// Un mismo campo recoge dos tipos de código, que viven en colecciones distintas: los del
// equipo en inviteCodes y los de colaborador en access. Se prueba primero el de colaborador
// porque es el que se puede descartar leyendo un solo documento; si no es ninguno de los dos,
// joinByCode lanza su propio "Código no válido".
//
// El canje de colaborador NO entra en la cuadra: un colaborador no es miembro. Por eso aquí
// no se navega a ningún sitio, solo se avisa. Sus pantallas llegan en el tramo siguiente.
export function JoinByCodeForm() {
  const { joinByCode } = useContext(StableSelectionContext) || {};
  const { redeemCollaboratorCode } = useCollaborators();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code.trim()) {
      setMessage("Introduce un código de invitación");
      return;
    }
    setMessage("");
    setSubmitting(true);
    try {
            if (redeemCollaboratorCode) {
                const collab = await redeemCollaboratorCode(code);
                if (collab) {
          setCode("");
          setMessage(
            "Acceso concedido en " + (collab.stableName || "la cuadra") + ". Ya puedes ver sus caballos."
          );
          return;
        }
      }
      const result = await joinByCode(code);
      setCode("");
      if (result.status === "linked") {
        setMessage("Te has unido como " + result.memberName);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: ".8rem", color: "var(--gr)", marginBottom: ".75rem" }}>
        ¿Tienes un código de invitación?
      </p>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <input
          placeholder="Código de invitación..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "inherit",
            fontSize: ".88rem",
            padding: ".6rem .8rem",
            border: "1px solid var(--li)",
            borderRadius: "9px",
            background: "#fff",
          }}
        />
        <button className="btn bts" onClick={handleSubmit} disabled={submitting}>
          Unirse
        </button>
      </div>
      {message && (
        <div style={{ fontSize: ".78rem", color: "var(--gr)", marginTop: ".5rem" }}>{message}</div>
      )}
    </div>
  );
}