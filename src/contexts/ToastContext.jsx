import { createContext, useCallback, useMemo, useRef, useState } from "react";

export const ToastContext = createContext(null);

// Ports the global toast() (public/legacy-app.js:984): show a message for 2300ms.
const TOAST_DURATION_MS = 2300;

export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const showToast = useCallback((text) => {
    setMessage(text);
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ message, visible, showToast }), [message, visible, showToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
