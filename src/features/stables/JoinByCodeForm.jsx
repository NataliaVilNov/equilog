import { useContext, useState } from "react";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";

// Ports the invite-code input + joinByCode() (index.html:54-60, public/legacy-app.js:496-559).
export function JoinByCodeForm() {
  const { joinByCode } = useContext(StableSelectionContext) || {};
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
      const result = await joinByCode(code);
      setCode("");
      if (result.status === "linked") {
        setMessage("Te has unido como " + result.memberName);
      } else if (result.status === "needs-member-selection") {
        setMessage("Elige tu integrante de equipo para continuar.");
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
