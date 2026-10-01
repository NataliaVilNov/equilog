import { useContext } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthContext, AuthProvider } from "./contexts/AuthContext.jsx";
import {
  StableSelectionContext,
  StableSelectionProvider,
} from "./contexts/StableSelectionContext.jsx";
import { StableDataProvider } from "./contexts/StableDataContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { ModalContext, ModalProvider } from "./contexts/ModalContext.jsx";
import { AppHeader } from "./components/layout/AppHeader.jsx";
import { BottomNav } from "./components/layout/BottomNav.jsx";
import { Toast } from "./components/Toast.jsx";
import { StablePanel } from "./features/stables/StablePanel.jsx";
import { JoinTeamModal } from "./features/stables/JoinTeamModal.jsx";
import { MorePanel } from "./features/home/MorePanel.jsx";
import { UserPanel } from "./features/profile/UserPanel.jsx";
import { AppRoutes } from "./routes/routes.jsx";

// StableDataProvider takes the active stable id as a prop rather than reading
// StableSelectionContext itself, so the two contexts stay decoupled — this small
// wrapper is what connects them in the provider tree.
function StableDataScope({ children }) {
  const { activeStableId } = useContext(StableSelectionContext) || {};
  return <StableDataProvider stableId={activeStableId}>{children}</StableDataProvider>;
}

function AppShell() {
  const { user } = useContext(AuthContext) || {};
  const { activeStableId } = useContext(StableSelectionContext) || {};
  const { isModalOpen } = useContext(ModalContext) || {};
  const showChrome = !!user && !!activeStableId;

  return (
    <>
      {showChrome && <AppHeader />}
      <div className="wrap" id="app-wrap">
        <div id="app">
          <AppRoutes />
        </div>
      </div>
      {showChrome && <BottomNav />}
      {showChrome && isModalOpen && isModalOpen("stablePanel") && <StablePanel />}
      {showChrome && isModalOpen && isModalOpen("morePanel") && <MorePanel />}
      {showChrome && isModalOpen && isModalOpen("userPanel") && <UserPanel />}
      <JoinTeamModal />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StableSelectionProvider>
        <StableDataScope>
          <ToastProvider>
            <ModalProvider>
              <BrowserRouter>
                <AppShell />
              </BrowserRouter>
            </ModalProvider>
          </ToastProvider>
        </StableDataScope>
      </StableSelectionProvider>
    </AuthProvider>
  );
}
