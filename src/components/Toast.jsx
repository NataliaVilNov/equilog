import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext.jsx";

// Ports the #toast markup (index.html:146), driven by ToastContext instead of the
// global toast() function (public/legacy-app.js:984).
export function Toast() {
  const { message, visible } = useContext(ToastContext) || {};

  return <div className={"toast" + (visible ? " show" : "")}>{message}</div>;
}
