import { useCallback, useEffect, useRef } from "react";

// Debounces invocation, not the value — each debounced call, once it fires, runs the LATEST
// fn with the args it was called with, so callers that read fresh state inside fn (e.g.
// updateHorseSale reading live `horses` context) stay correct even though the call is delayed.
export function useDebouncedCallback(fn, delayMs = 250) {
  const timerRef = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return debounced;
}
