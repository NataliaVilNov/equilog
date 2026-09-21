import { useContext } from "react";
import { StableDataContext } from "../contexts/StableDataContext.jsx";

export function useStableData() {
  const context = useContext(StableDataContext);
  if (!context) {
    throw new Error("useStableData must be used within a StableDataProvider");
  }
  return context;
}
