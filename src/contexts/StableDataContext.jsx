import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getStableDoc,
  setStableDoc,
  subscribeToStableDoc,
} from "../lib/firestore.js";
import { cleanForFirestore } from "../lib/cleanForFirestore.js";
import { useDebouncedSave } from "../hooks/useDebouncedSave.js";

// Matches the legacy app's localStorage key (public/legacy-app.js:880) so the write-only
// fallback below lands in the same place the legacy app already writes to.
const LOCAL_STORAGE_KEY = "equilog_v4";

// Mirrors the defensive array-defaulting list in _fbLoadData/_fbSetupListener
// (public/legacy-app.js:437,453) — note this is one key longer than legacy's own load()
// (public/legacy-app.js:986-989), which omits expenseSettlements even though the realtime
// listener always defaults it.
const COLLECTION_KEYS = [
  "horses",
  "trainings",
  "health",
  "healthDocs",
  "expenses",
  "team",
  "tasks",
  "ctasks",
  "cexpenses",
  "salerts",
  "templates",
  "absences",
  "expenseSettlements",
];

function emptyData() {
  return COLLECTION_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

// Mirrors the defensive array-defaulting in _fbLoadData/_fbSetupListener
// (public/legacy-app.js:437, :453).
function withDefaults(raw) {
  const data = { ...emptyData(), ...raw };
  COLLECTION_KEYS.forEach((key) => {
    if (!data[key]) data[key] = [];
  });
  return data;
}

export const StableDataContext = createContext(null);

export function StableDataProvider({ stableId, children }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ports the write path of the legacy save() (public/legacy-app.js:1007-1028): write to
  // Firestore, and if that's unavailable, fall back to localStorage (write-only — the
  // legacy app never reads this back either; it's a safety net, not an offline cache).
  const writeToFirestore = useCallback(async (id, nextData) => {
    const cleanData = cleanForFirestore(nextData);
    if (!id) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
      } catch (_e) {
        // ignore
      }
      return;
    }
    try {
      await setStableDoc(id, cleanData);
    } catch (e) {
      setError(e);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
      } catch (_e) {
        // ignore
      }
    }
  }, []);

  const debouncedWrite = useDebouncedSave(writeToFirestore, 250);

  useEffect(() => {
    let cancelled = false;

    if (!stableId) {
      setData(emptyData());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // First paint via a one-time read, mirrors _fbLoadData (public/legacy-app.js:429-442).
    getStableDoc(stableId)
      .then((initial) => {
        if (!cancelled) setData(withDefaults(initial || {}));
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Realtime sync, mirrors _fbSetupListener (public/legacy-app.js:445-457).
    const unsubscribe = subscribeToStableDoc(stableId, (remoteData) => {
      if (!cancelled) setData(withDefaults(remoteData));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [stableId]);

  // Generic mutation primitive: feature-specific mutators (addHorse, cycleTaskStatus, etc.)
  // are built on top of this as each feature needs them, rather than pre-built here.
  const updateData = useCallback(
    (updater) => {
      setData((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        debouncedWrite(stableId, next);
        return next;
      });
    },
    [stableId, debouncedWrite]
  );

  // Ports the horse CRUD portion of the save-horse-btn handler in attach()
  // (public/legacy-app.js:3622-3646) and delHorse (public/legacy-app.js:1644-1653).
  const addHorse = useCallback(
    (horse) => {
      updateData((prev) => ({ ...prev, horses: [...prev.horses, horse] }));
    },
    [updateData]
  );

  const updateHorse = useCallback(
    (horse) => {
      updateData((prev) => ({
        ...prev,
        horses: prev.horses.map((h) => (h.id === horse.id ? horse : h)),
      }));
    },
    [updateData]
  );

  const deleteHorse = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        horses: prev.horses.filter((h) => h.id !== id),
        trainings: prev.trainings.filter((t) => t.hid !== id),
        health: prev.health.filter((r) => r.hid !== id),
        healthDocs: (prev.healthDocs || []).filter((r) => r.hid !== id),
        expenses: prev.expenses.filter((e) => e.hid !== id),
        tasks: prev.tasks.filter((t) => t.hid !== id),
      }));
    },
    [updateData]
  );

  const value = useMemo(
    () => ({ ...data, loading, error, updateData, addHorse, updateHorse, deleteHorse }),
    [data, loading, error, updateData, addHorse, updateHorse, deleteHorse]
  );

  return (
    <StableDataContext.Provider value={value}>
      {children}
    </StableDataContext.Provider>
  );
}
