import { useCallback, useEffect, useRef } from "react";

// Ports the debounce behavior of the legacy save() (public/legacy-app.js:1007):
// rapid successive calls collapse into one write, `delay` ms after the last call.
export function useDebouncedSave(saveFn, delay = 250) {
  const timeoutRef = useRef(null);
  const latestArgsRef = useRef(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return useCallback(
    (...args) => {
      latestArgsRef.current = args;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        saveFn(...latestArgsRef.current);
      }, delay);
    },
    [saveFn, delay]
  );
}
