import { useContext } from "react";
import { ModalContext } from "../../contexts/ModalContext.jsx";
import { NotionSettingsSheet } from "./NotionSettingsSheet.jsx";

// The "Notion" entry of the More panel, mounted from App.jsx like StablePanel/UserPanel.
export function NotionPanel() {
  const { closeModal } = useContext(ModalContext) || {};
  return <NotionSettingsSheet onClose={() => closeModal && closeModal("notionPanel")} />;
}
