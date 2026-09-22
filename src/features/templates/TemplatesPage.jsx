import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { Fab } from "../../components/layout/Fab.jsx";

// Ports rTpls (public/legacy-app.js:3488-3502). The route-level PermissionRoute("team")
// replaces requirePermissionView — matches legacy gating templates on the 'team' permission
// even though they're reached from the day board, not the team screen.
export function TemplatesPage() {
  const { taskTemplates, applyTemplate } = useStableData();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ds = searchParams.get("d") || td();

  function handleApply(tpl) {
    applyTemplate(tpl.id, ds);
    showToast(`"${tpl.name}" aplicada`);
    navigate(`/day?d=${ds}`);
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(`/day?d=${ds}`)}>
          ←
        </button>
        <h1>Plantillas</h1>
      </div>
      <p style={{ fontSize: ".8rem", color: "var(--gr)", marginBottom: ".85rem" }}>
        Configuraciones habituales para aplicar de un toque.
      </p>
      {!taskTemplates.length ? (
        <EmptyState icon="📋">
          Sin plantillas. Pulsa <b>+</b>.
        </EmptyState>
      ) : (
        taskTemplates.map((tpl) => (
          <div className="tplc" key={tpl.id}>
            <div style={{ fontSize: "1.3rem" }}>📋</div>
            <div style={{ flex: 1 }}>
              <div className="tn">{tpl.name}</div>
              <div style={{ fontSize: ".76rem", color: "var(--gr)" }}>
                {tpl.tasks.length} tarea{tpl.tasks.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button type="button" className="btn bts btsm" onClick={() => handleApply(tpl)}>
              Aplicar
            </button>
            <button
              type="button"
              className="ib"
              style={{ marginLeft: ".3rem" }}
              onClick={() => navigate(`/templates/${tpl.id}/edit`)}
            >
              ✏️
            </button>
          </div>
        ))
      )}
      {can("team") && <Fab onClick={() => navigate("/templates/new")} />}
    </div>
  );
}
