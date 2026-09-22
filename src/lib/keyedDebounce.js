// Per-key debounce, so writes to independent documents don't cancel each other out the way
// a single shared debounce timer would.
export function createKeyedDebouncer(delay = 250) {
  const timers = new Map();

  function schedule(key, fn) {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn();
      }, delay)
    );
  }

  function cancel(key) {
    const existing = timers.get(key);
    if (existing) {
      clearTimeout(existing);
      timers.delete(key);
    }
  }

  return { schedule, cancel };
}
