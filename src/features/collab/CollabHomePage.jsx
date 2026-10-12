import { useNavigate } from "react-router-dom";
import { useCollaborators } from "../../contexts/CollaboratorsContext.jsx";
import { collaboratorTypeLabel } from "../../lib/collaboratorTypes.js";
import { StableAccessCard } from "./StableAccessCard.jsx";

// Pantalla de quien entra como colaborador externo: todas sus cuadras y los caballos a los
// que le han dado acceso, en una sola vista. No es miembro de ninguna cuadra, así que no
// puede usar ninguna de las pantallas normales de la app.
export function CollabHomePage() {
  const { myAccesses } = useCollaborators();
  const navigate = useNavigate();

  const active = (myAccesses || []).filter((a) => a.status === "active");

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">Colaborador</span>
          <h1>Mis cuadras</h1>
        </div>
      </div>

      {!active.length ? (
        <div className="em" style={{ padding: "1.5rem .5rem" }}>
          <p>
            Todavía no tienes acceso a ninguna cuadra.
            <br />
            Pide un código al responsable de la cuadra.
          </p>
          <button
            className="btn btsm btg"
            style={{ marginTop: ".6rem" }}
            onClick={() => navigate("/stables")}
          >
            Introducir un código
          </button>
        </div>
      ) : (
        active.map((a) => (
          <StableAccessCard key={a.id} access={a} typeLabel={collaboratorTypeLabel(a.type)} />
        ))
      )}
    </div>
  );
}