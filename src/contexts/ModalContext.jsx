import { createContext, useCallback, useMemo, useState } from "react";

// Replaces the imperative open/close globals for named overlays (stable panel, user
// panel, create-stable modal, join-team modal, more-options sheet, etc.) with a small
// keyed registry any component can open/close without reaching into the DOM.
export const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [openModals, setOpenModals] = useState({});

  const openModal = useCallback((key, payload = true) => {
    setOpenModals((prev) => ({ ...prev, [key]: payload }));
  }, []);

  const closeModal = useCallback((key) => {
    setOpenModals((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const isModalOpen = useCallback((key) => key in openModals, [openModals]);
  const getModalPayload = useCallback((key) => openModals[key] ?? null, [openModals]);

  const value = useMemo(
    () => ({ openModals, openModal, closeModal, isModalOpen, getModalPayload }),
    [openModals, openModal, closeModal, isModalOpen, getModalPayload]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}
