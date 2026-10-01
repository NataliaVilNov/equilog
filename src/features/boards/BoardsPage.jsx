import { useNavigate, useSearchParams } from "react-router-dom";
import { td } from "../../lib/date.js";
import { boardStartOfWeek } from "./boardHelpers.js";
import { Tabs } from "../../components/Tabs.jsx";
import { WeeklyBoardGrid } from "./weekly/WeeklyBoardGrid.jsx";
import { MonthBoardGrid } from "./month/MonthBoardGrid.jsx";
import { ResourceBoardPage } from "./resource/ResourceBoardPage.jsx";
import { BoardConfigPage } from "./config/BoardConfigPage.jsx";

const TABS = [
  { key: "weekly", label: "Principal" },
  { key: "month", label: "Mes" },
  { key: "walker", label: "Caminador" },
  { key: "paddock", label: "Paddocks" },
  { key: "config", label: "Configurar" },
];

// Ports rBoards (public/legacy-app.js:1348-1357). No permission gate — matches legacy
// exactly, see routes.jsx for the reasoning.
export function BoardsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "weekly";
  const week = searchParams.get("week") || boardStartOfWeek(td());
  const date = searchParams.get("date") || td();

  function switchTab(key) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", key);
    navigate(`/boards?${params.toString()}`);
  }

  return (
    <div className="view board-view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/home")}>
          ←
        </button>
        <div>
          <span className="ey">Organización diaria</span>
          <h1>Pizarras</h1>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={switchTab} />
      {tab === "weekly" && <WeeklyBoardGrid week={week} />}
      {tab === "month" && <MonthBoardGrid />}
      {tab === "walker" && <ResourceBoardPage type="walker" date={date} />}
      {tab === "paddock" && <ResourceBoardPage type="paddock" date={date} />}
      {tab === "config" && <BoardConfigPage />}
    </div>
  );
}
