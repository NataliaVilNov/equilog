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
import { writeBatch, query, where } from "firebase/firestore";
import {
  stableCollection,
  stableDoc,
  writeDoc,
  patchDoc,
  deleteDocRef,
  subscribeToCollection,
  subscribeToCollectionGroup,
  batchDeleteQuery,
} from "../lib/firestoreCollections.js";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, db } from "../lib/firebaseClient.js";
import { catFromHealthType, activityById } from "../lib/constants.js";
import { taskNeedsReturn } from "../features/tasks/taskHelpers.js";
import { boardDefaults } from "../features/boards/boardDefaults.js";
import { boardAssignment, horseConflict, safeBoardId } from "../features/boards/boardHelpers.js";
import { uid } from "../lib/id.js";
import { td, addD } from "../lib/date.js";

// Ports uploadFileWithProgress (public/legacy-app.js:1097-1109), minus the DOM status
// write — callers pass an onProgress(pct) callback instead.
function uploadFileWithProgress(ref, file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, file, metadata);
    task.on(
      "state_changed",
      (snap) => {
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

function safeStorageName(name) {
  return (name || "documento")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);
}

// Matches the legacy app's localStorage key (public/legacy-app.js:880) so the write-only
// fallback below lands in the same place the legacy app already writes to.
const LOCAL_STORAGE_KEY = "equilog_v4";

// Mirrors the defensive array-defaulting list in _fbLoadData/_fbSetupListener
// (public/legacy-app.js:437,453) — note this is one key longer than legacy's own load()
// (public/legacy-app.js:986-989), which omits expenseSettlements even though the realtime
// listener always defaults it.
const COLLECTION_KEYS = [
  "ctasks",
  "cexpenses",
  "templates",
  "absences",
  "expenseSettlements",
  "weeklyPlans",
  "periodicBoardDates",
  "boardAssignments",
];

function emptyData() {
  const data = COLLECTION_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
  data.boardConfig = boardDefaults();
  return data;
}

// Mirrors ensureBoardData's defensive defaulting (public/legacy-app.js:1289-1299) alongside
// the array collections' own defaulting from _fbLoadData/_fbSetupListener
// (public/legacy-app.js:437, :453). `boardConfig` is the only non-array collection here.
function withDefaults(raw) {
  const data = { ...emptyData(), ...raw };
  COLLECTION_KEYS.forEach((key) => {
    if (!data[key]) data[key] = [];
  });
  if (!data.boardConfig || typeof data.boardConfig !== "object") {
    data.boardConfig = boardDefaults();
  } else {
    const defaults = boardDefaults();
    ["activities", "periodicColumns", "walkers", "paddocks", "paddockSlots"].forEach((k) => {
      if (!Array.isArray(data.boardConfig[k])) data.boardConfig[k] = defaults[k];
    });
    // Backfills the "vet" activity onto stables created before the weekly board's VET flow
    // existed — new stables already get it from boardDefaults() above.
    if (!data.boardConfig.activities.some((a) => a.id === "vet")) {
      data.boardConfig.activities = [...data.boardConfig.activities, defaults.activities.find((a) => a.id === "vet")];
    }
  }
  // weeklyPlans rows predating the note/completed/vet-link fields default them here rather
  // than being backfilled in Firestore — read-time defaulting only, same as every other
  // optional field in this function.
  data.weeklyPlans = data.weeklyPlans.map((p) => ({
    completed: [],
    note: "",
    vetHealthId: null,
    ...p,
  }));
  return data;
}

export const StableDataContext = createContext(null);

export function StableDataProvider({ stableId, children }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [horses, setHorses] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [health, setHealth] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [healthDocs, setHealthDocs] = useState([]);
  const [team, setTeam] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessionAlerts, setSessionAlerts] = useState([]);

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

  useEffect(() => {
    if (!stableId) {
      setHorses([]);
      return;
    }
    return subscribeToCollection(stableCollection(stableId, "horses"), setHorses);
  }, [stableId]);

  useEffect(() => {
    if (!stableId) {
      setTeam([]);
      return;
    }
    return subscribeToCollection(stableCollection(stableId, "team"), setTeam);
  }, [stableId]);

  useEffect(() => {
    if (!stableId) {
      setTasks([]);
      return;
    }
    return subscribeToCollection(stableCollection(stableId, "tasks"), setTasks);
  }, [stableId]);

  useEffect(() => {
    if (!stableId) {
      setSessionAlerts([]);
      return;
    }
    return subscribeToCollection(stableCollection(stableId, "sessionAlerts"), setSessionAlerts);
  }, [stableId]);

  useEffect(() => {
    if (!stableId) {
      setTrainings([]);
      setHealth([]);
      setExpenses([]);
      setHealthDocs([]);
      return;
    }
    const unsubs = [
      subscribeToCollectionGroup("trainings", stableId, setTrainings),
      subscribeToCollectionGroup("health", stableId, setHealth),
      subscribeToCollectionGroup("expenses", stableId, setExpenses),
      subscribeToCollectionGroup("healthDocs", stableId, setHealthDocs),
    ];
    return () => unsubs.forEach((u) => u());
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
      writeDoc(stableDoc(stableId, "horses", horse.id), horse);
    },
    [stableId]
  );

  const updateHorse = useCallback(
    (horse) => {
      writeDoc(stableDoc(stableId, "horses", horse.id), horse);
    },
    [stableId]
  );

  // trainings/health/healthDocs/expenses are subcollections of the horse doc itself, so
  // deleting it just deletes them too; tasks is a stable-level collection, so its cascade
  // needs its own query.
  const deleteHorse = useCallback(
    async (id) => {
      await Promise.all([
        batchDeleteQuery(stableCollection(stableId, "horses", id, "trainings")),
        batchDeleteQuery(stableCollection(stableId, "horses", id, "health")),
        batchDeleteQuery(stableCollection(stableId, "horses", id, "expenses")),
        batchDeleteQuery(stableCollection(stableId, "horses", id, "healthDocs")),
        batchDeleteQuery(query(stableCollection(stableId, "tasks"), where("horseId", "==", id))),
      ]);
      await deleteDocRef(stableDoc(stableId, "horses", id));
    },
    [stableId]
  );

  // Sets each horse's sortOrder to its index in orderedIds — the shared order used by both
  // the horse list and the weekly board's rows (see sortHorsesByOrder in
  // features/horses/horseOrder.js). Horses missing from orderedIds keep their existing
  // sortOrder (defensive — shouldn't happen, the caller always passes every horse id).
  const reorderHorses = useCallback(
    (orderedIds) => {
      const batch = writeBatch(db);
      horses.forEach((h) => {
        const idx = orderedIds.indexOf(h.id);
        if (idx !== -1 && idx !== h.sortOrder) {
          batch.update(stableDoc(stableId, "horses", h.id), { sortOrder: idx });
        }
      });
      batch.commit();
    },
    [horses, stableId]
  );

  // Ports the training portion of save-training-btn (public/legacy-app.js:3648-3651) and
  // the training-delete inline handler in the "entrenos" tab (public/legacy-app.js:1707).
  // No update mutator — legacy has no training-edit UI.
  const addTraining = useCallback(
    (training) => {
      writeDoc(stableDoc(stableId, "horses", training.hid, "trainings", training.id), {
        ...training,
        stableId,
      });
    },
    [stableId]
  );

  const deleteTraining = useCallback(
    (id) => {
      const t = trainings.find((x) => x.id === id);
      if (!t) return;
      deleteDocRef(stableDoc(stableId, "horses", t.hid, "trainings", id));
    },
    [trainings, stableId]
  );

  // Ports the health portion of save-health-btn (public/legacy-app.js:3644-3665): adding or
  // editing a health record with amount > 0 auto-creates/updates a linked expense entry —
  // batched so both docs commit together.
  const addHealthRecord = useCallback(
    (record) => {
      const batch = writeBatch(db);
      batch.set(
        stableDoc(stableId, "horses", record.hid, "health", record.id),
        cleanForFirestore({ ...record, stableId })
      );
      if (Number(record.amount) > 0) {
        const expenseId = uid();
        batch.set(
          stableDoc(stableId, "horses", record.hid, "expenses", expenseId),
          cleanForFirestore({
            id: expenseId,
            stableId,
            hid: record.hid,
            concept: record.label || record.type,
            amount: record.amount,
            date: record.date,
            cat: catFromHealthType(record.type),
            payer: "Cuadra",
            payee: record.payee,
            status: record.payStatus,
            notes: "",
            healthId: record.id,
          })
        );
      }
      batch.commit();
    },
    [stableId]
  );

  const updateHealthRecord = useCallback(
    (record) => {
      const batch = writeBatch(db);
      batch.set(
        stableDoc(stableId, "horses", record.hid, "health", record.id),
        cleanForFirestore({ ...record, stableId })
      );
      const linked = expenses.find((e) => e.healthId === record.id);
      const amount = Number(record.amount) || 0;
      if (linked && amount > 0) {
        batch.update(
          stableDoc(stableId, "horses", record.hid, "expenses", linked.id),
          cleanForFirestore({
            amount: record.amount,
            status: record.payStatus,
            payee: record.payee,
            concept: record.label || record.type,
          })
        );
      } else if (!linked && amount > 0) {
        const expenseId = uid();
        batch.set(
          stableDoc(stableId, "horses", record.hid, "expenses", expenseId),
          cleanForFirestore({
            id: expenseId,
            stableId,
            hid: record.hid,
            concept: record.label || record.type,
            amount: record.amount,
            date: record.date,
            cat: catFromHealthType(record.type),
            payer: "Cuadra",
            payee: record.payee,
            status: record.payStatus,
            notes: "",
            healthId: record.id,
          })
        );
      }
      batch.commit();
    },
    [expenses, stableId]
  );

  const deleteHealthRecord = useCallback(
    (id) => {
      const record = health.find((r) => r.id === id);
      if (!record) return;
      deleteDocRef(stableDoc(stableId, "horses", record.hid, "health", id));
    },
    [health, stableId]
  );

  // Ports addHealthDocLink (public/legacy-app.js:1116-1130).
  const addHealthDocLink = useCallback(
    ({ hid, category, date, notes, title, url, userId }) => {
      const horse = horses.find((x) => x.id === hid);
      const id = uid();
      const doc = {
        id,
        stableId,
        hid,
        horseName: horse ? horse.name : "",
        category: category || "otro",
        date: date || td(),
        notes: notes || "",
        title: title || "Documento enlazado",
        name: title || "Documento enlazado",
        url,
        source: "link",
        createdBy: userId || null,
        createdAt: new Date().toISOString(),
      };
      writeDoc(stableDoc(stableId, "horses", hid, "healthDocs", id), doc);
    },
    [horses, stableId]
  );

  // Ports uploadHealthDocs (public/legacy-app.js:1132-1176): uploads every file to Firebase
  // Storage, then writes all resulting doc records in a single batch (matching legacy's
  // single loop + one save()), reporting progress via onProgress(label, pct).
  const uploadHealthDocs = useCallback(
    async ({ hid, files, category, date, notes, userId, onProgress }) => {
      const horse = horses.find((x) => x.id === hid);
      const added = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = uid();
        const path = `stables/${stableId}/horses/${hid}/health_docs/${Date.now()}_${id}_${safeStorageName(
          file.name
        )}`;
        const ref = storageRef(storage, path);
        const metadata = {
          contentType: file.type || "application/octet-stream",
          customMetadata: { stableId, horseId: hid, uploadedBy: userId || "", originalName: file.name },
        };
        const url = await uploadFileWithProgress(ref, file, metadata, (pct) =>
          onProgress && onProgress(`${i + 1}/${files.length}`, pct)
        );
        added.push({
          id,
          stableId,
          hid,
          horseName: horse ? horse.name : "",
          category: category || "otro",
          date: date || td(),
          notes: notes || "",
          name: file.name,
          title: file.name,
          type: file.type || "",
          size: file.size || 0,
          path,
          url,
          createdBy: userId || null,
          createdAt: new Date().toISOString(),
        });
      }
      const batch = writeBatch(db);
      added.forEach((doc) => {
        batch.set(stableDoc(stableId, "horses", hid, "healthDocs", doc.id), cleanForFirestore(doc));
      });
      await batch.commit();
      return added;
    },
    [horses, stableId]
  );

  // Ports deleteHealthDoc (public/legacy-app.js:1177-1188).
  const deleteHealthDoc = useCallback(
    async (id) => {
      const doc = healthDocs.find((x) => x.id === id);
      if (!doc) return;
      if (doc.path) {
        try {
          await deleteObject(storageRef(storage, doc.path));
        } catch (_e) {
          // non-fatal, mirrors legacy behavior
        }
      }
      await deleteDocRef(stableDoc(stableId, "horses", doc.hid, "healthDocs", id));
    },
    [healthDocs, stableId]
  );

  // Ports the expense-save handler (public/legacy-app.js:3713-3730) and deleteExpense
  // (public/legacy-app.js:2132-2143 — deliberately doesn't touch a linked health record,
  // matching the legacy comment there).
  const addExpense = useCallback(
    (expense) => {
      writeDoc(stableDoc(stableId, "horses", expense.hid, "expenses", expense.id), {
        ...expense,
        stableId,
      });
    },
    [stableId]
  );

  const updateExpense = useCallback(
    (expense) => {
      writeDoc(stableDoc(stableId, "horses", expense.hid, "expenses", expense.id), {
        ...expense,
        stableId,
      });
    },
    [stableId]
  );

  const deleteExpense = useCallback(
    (id) => {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return;
      deleteDocRef(stableDoc(stableId, "horses", expense.hid, "expenses", id));
    },
    [expenses, stableId]
  );

  // Ports confirmExpenseSettlement (public/legacy-app.js:969-976): records the settlement
  // and marks every settled expense.
  const addExpenseSettlement = useCallback(
    (settlement) => {
      const batch = writeBatch(db);
      expenses
        .filter((e) => settlement.expenseIds.includes(e.id))
        .forEach((e) => {
          batch.update(
            stableDoc(stableId, "horses", e.hid, "expenses", e.id),
            cleanForFirestore({
              settled: true,
              settlementId: settlement.id,
              settledDate: settlement.date,
            })
          );
        });
      batch.commit();
      updateData((prev) => ({
        ...prev,
        expenseSettlements: [...(prev.expenseSettlements || []), settlement],
      }));
    },
    [expenses, updateData, stableId]
  );

  // Ports saleUpdate/saleOwnerUpdate/saleAddOwner/saleRemoveOwner
  // (public/legacy-app.js:3584-3614) as one generic mutator: the venta tab has no separate
  // save button in legacy either — every field writes straight through, debounced same as
  // everything else.
  const updateHorseSale = useCallback(
    (hid, updater) => {
      const h = horses.find((x) => x.id === hid);
      const currentSale = (h && h.sale) || { precio: 0, owners: [{ nombre: "", pct: 100 }] };
      const nextSale = typeof updater === "function" ? updater(currentSale) : { ...currentSale, ...updater };
      patchDoc(stableDoc(stableId, "horses", hid), { sale: nextSale });
    },
    [horses, stableId]
  );

  // Ports the task-save handler (public/legacy-app.js:3669-3676) and its inline delete
  // handler (public/legacy-app.js:3274, which also clears any salerts tied to the task).
  const addTask = useCallback(
    (task) => {
      writeDoc(stableDoc(stableId, "tasks", task.id), { ...task, stableId });
    },
    [stableId]
  );

  const updateTask = useCallback(
    (task) => {
      writeDoc(stableDoc(stableId, "tasks", task.id), { ...task, stableId });
    },
    [stableId]
  );

  const deleteTask = useCallback(
    (id) => {
      const batch = writeBatch(db);
      sessionAlerts
        .filter((s) => s.tid === id)
        .forEach((s) => batch.delete(stableDoc(stableId, "sessionAlerts", s.id)));
      batch.commit();
      deleteDocRef(stableDoc(stableId, "tasks", id));
    },
    [sessionAlerts, stableId]
  );

  // Ports cycleTask (public/legacy-app.js:3226-3242): cycling a task to "done" auto-creates
  // a pending session-report alert for activities that require one (AK[].r) and that are
  // linked to a horse — a general chore has no horse to attach a training report to; cycling
  // away from "done" removes any unanswered alert it created.
  const cycleTaskStatus = useCallback(
    (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      let nextStatus;
      if (taskNeedsReturn(task.activity)) {
        nextStatus = { pending: "inprogress", inprogress: "done", done: "pending" }[task.status] || "pending";
      } else {
        nextStatus = task.status === "done" ? "pending" : "done";
      }
      writeDoc(stableDoc(stableId, "tasks", id), { ...task, status: nextStatus, stableId });
      if (nextStatus === "done") {
        const activity = activityById(task.activity);
        if (activity.r && task.horseId != null && !sessionAlerts.some((s) => s.tid === id && !s.ans)) {
          const horse = horses.find((h) => h.id === task.horseId);
          const alertId = uid();
          writeDoc(stableDoc(stableId, "sessionAlerts", alertId), {
            id: alertId,
            stableId,
            tid: id,
            hid: task.horseId,
            hn: horse ? horse.name : "",
            act: task.activity,
            date: task.startDate,
            pid: task.assignedTo,
            ans: false,
          });
        }
      } else {
        const batch = writeBatch(db);
        sessionAlerts
          .filter((s) => s.tid === id && !s.ans)
          .forEach((s) => batch.delete(stableDoc(stableId, "sessionAlerts", s.id)));
        batch.commit();
      }
    },
    [tasks, horses, sessionAlerts, stableId]
  );

  // Ports the save-session-btn handler (public/legacy-app.js:3706-3712): answering a
  // pending session-report alert creates a new training record and marks the alert
  // answered, in one atomic action (legacy treats it as one user action, not two).
  const answerSessionAlert = useCallback(
    (alertId, sessionData) => {
      const alert = sessionAlerts.find((s) => s.id === alertId);
      if (!alert) return;
      const training = {
        id: uid(),
        hid: alert.hid,
        date: alert.date,
        dur: sessionData.dur,
        wtype: alert.act === "longe" ? "longe" : "doma",
        state: sessionData.state,
        feel: sessionData.feel,
        notes: sessionData.notes,
        rating: sessionData.rating,
      };
      writeDoc(stableDoc(stableId, "horses", alert.hid, "trainings", training.id), {
        ...training,
        stableId,
      });
      writeDoc(stableDoc(stableId, "sessionAlerts", alertId), { ...alert, ans: true });
    },
    [sessionAlerts, stableId]
  );

  // Ports saveTpl/applyTpl (public/legacy-app.js:3503-3551).
  const addTemplate = useCallback(
    (template) => {
      updateData((prev) => ({ ...prev, templates: [...prev.templates, template] }));
    },
    [updateData]
  );

  const updateTemplate = useCallback(
    (template) => {
      updateData((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => (t.id === template.id ? template : t)),
      }));
    },
    [updateData]
  );

  const deleteTemplate = useCallback(
    (id) => {
      updateData((prev) => ({ ...prev, templates: prev.templates.filter((t) => t.id !== id) }));
    },
    [updateData]
  );

  const applyTemplate = useCallback(
    (templateId, date) => {
      const tpl = data.templates.find((t) => t.id === templateId);
      if (!tpl) return;
      const batch = writeBatch(db);
      tpl.tasks.forEach((t) => {
        const id = uid();
        batch.set(
          stableDoc(stableId, "tasks", id),
          cleanForFirestore({
            id,
            stableId,
            horseId: t.hid,
            activity: t.activity,
            assignedTo: t.pid,
            dur: t.dur,
            startDate: date,
            status: "pending",
            notes: "",
            time: null,
          })
        );
      });
      batch.commit();
    },
    [data.templates, stableId]
  );

  // Ports save-member-btn (public/legacy-app.js:3677-3685) and the inline delete handler
  // in rMF (public/legacy-app.js:3416), which also nulls out `pid` on any task assigned to
  // the deleted member rather than leaving it dangling.
  const addTeamMember = useCallback(
    (member) => {
      writeDoc(stableDoc(stableId, "team", member.id), member);
    },
    [stableId]
  );

  const updateTeamMember = useCallback(
    (member) => {
      writeDoc(stableDoc(stableId, "team", member.id), member);
    },
    [stableId]
  );

  const deleteTeamMember = useCallback(
    (id) => {
      const batch = writeBatch(db);
      tasks
        .filter((t) => t.assignedTo === id)
        .forEach((t) => batch.update(stableDoc(stableId, "tasks", t.id), { assignedTo: null }));
      batch.commit();
      deleteDocRef(stableDoc(stableId, "team", id));
    },
    [tasks, stableId]
  );

  // Ports toggleAbsence (public/legacy-app.js:3314-3321): toggles a single day on/off as a
  // rest/absence day for a team member.
  const toggleAbsence = useCallback(
    (pid, date) => {
      updateData((prev) => {
        const absences = prev.absences || [];
        const existing = absences.find((a) => a.pid === pid && a.date === date);
        return {
          ...prev,
          absences: existing
            ? absences.filter((a) => a.id !== existing.id)
            : [...absences, { id: uid(), pid, date, type: "descanso", note: "" }],
        };
      });
    },
    [updateData]
  );

  // Ports save-ct-btn (public/legacy-app.js:3688-3695) and doneCT
  // (public/legacy-app.js:2281-2284) — stable-wide recurring tasks ("Cuadra").
  const addStableTask = useCallback(
    (task) => {
      updateData((prev) => ({ ...prev, ctasks: [...prev.ctasks, task] }));
    },
    [updateData]
  );

  const updateStableTask = useCallback(
    (task) => {
      updateData((prev) => ({ ...prev, ctasks: prev.ctasks.map((t) => (t.id === task.id ? task : t)) }));
    },
    [updateData]
  );

  const deleteStableTask = useCallback(
    (id) => {
      updateData((prev) => ({ ...prev, ctasks: prev.ctasks.filter((t) => t.id !== id) }));
    },
    [updateData]
  );

  const doneStableTask = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        ctasks: prev.ctasks.map((t) => (t.id === id ? { ...t, ld: td() } : t)),
      }));
    },
    [updateData]
  );

  // Ports save-ce-btn (public/legacy-app.js:3697-3704) — stable-wide expenses.
  const addStableExpense = useCallback(
    (expense) => {
      updateData((prev) => ({ ...prev, cexpenses: [...prev.cexpenses, expense] }));
    },
    [updateData]
  );

  const updateStableExpense = useCallback(
    (expense) => {
      updateData((prev) => ({
        ...prev,
        cexpenses: prev.cexpenses.map((e) => (e.id === expense.id ? expense : e)),
      }));
    },
    [updateData]
  );

  const deleteStableExpense = useCallback(
    (id) => {
      updateData((prev) => ({ ...prev, cexpenses: prev.cexpenses.filter((e) => e.id !== id) }));
    },
    [updateData]
  );

  // Ports saveBoardCell (public/legacy-app.js:1323-1328): full-array replace of a horse's
  // planned activities for one day, deleting the record when it becomes empty. Always
  // assigns an id (legacy's version only does for records created via the quick-toggle
  // path, boardQuickCell — harmless normalization since lookup is always by hid+date).
  const setWeeklyPlanActivities = useCallback(
    (hid, date, activities) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const i = weeklyPlans.findIndex((p) => p.hid === hid && p.date === date);
        const existing = i >= 0 ? weeklyPlans[i] : null;
        // A row is only deleted when it's fully empty — activities plus the note/vet-link
        // fields added after this mutator was first written — so clearing the activity
        // order doesn't silently drop a cell's note or vet link.
        const hasOtherContent = !!(existing && (existing.note || existing.vetHealthId));
        let next;
        if (activities.length || hasOtherContent) {
          const rec = {
            id: existing ? existing.id || uid() : uid(),
            hid,
            date,
            activities,
            note: existing?.note || "",
            completed: (existing?.completed || []).filter((c) => activities.includes(c)),
            vetHealthId: existing?.vetHealthId || null,
          };
          next = i >= 0 ? weeklyPlans.map((p, idx) => (idx === i ? rec : p)) : [...weeklyPlans, rec];
        } else {
          next = i >= 0 ? weeklyPlans.filter((_, idx) => idx !== i) : weeklyPlans;
        }
        return { ...prev, weeklyPlans: next };
      });
    },
    [updateData]
  );

  // Ports the quick-assign toggle inside boardQuickCell (public/legacy-app.js:1387-1396).
  const toggleWeeklyPlanActivity = useCallback(
    (hid, date, activityId) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const i = weeklyPlans.findIndex((p) => p.hid === hid && p.date === date);
        if (i < 0) {
          return {
            ...prev,
            weeklyPlans: [
              ...weeklyPlans,
              { id: uid(), hid, date, activities: [activityId], completed: [], note: "", vetHealthId: null },
            ],
          };
        }
        const existing = weeklyPlans[i];
        const activities = Array.isArray(existing.activities) ? existing.activities : [];
        const removing = activities.includes(activityId);
        const nextActivities = removing ? activities.filter((a) => a !== activityId) : [...activities, activityId];
        // Removing an activity also drops its completed-state, matching setWeeklyPlanActivities.
        const nextCompleted = removing
          ? (existing.completed || []).filter((c) => c !== activityId)
          : existing.completed || [];
        return {
          ...prev,
          weeklyPlans: weeklyPlans.map((p, pi) =>
            pi === i ? { ...existing, activities: nextActivities, completed: nextCompleted } : p
          ),
        };
      });
    },
    [updateData]
  );

  // Sets or clears a weekly-plan cell's free-text note. Deletes the row entirely if it
  // becomes fully empty (no activities, no note, no vet link), matching
  // setWeeklyPlanActivities's existing "empty row is removed" convention.
  const setWeeklyPlanNote = useCallback(
    (hid, date, note) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const i = weeklyPlans.findIndex((p) => p.hid === hid && p.date === date);
        const trimmed = (note || "").trim().slice(0, 240);
        if (i < 0) {
          if (!trimmed) return prev;
          return {
            ...prev,
            weeklyPlans: [...weeklyPlans, { id: uid(), hid, date, activities: [], completed: [], note: trimmed, vetHealthId: null }],
          };
        }
        const existing = weeklyPlans[i];
        const hasOtherContent = !!((existing.activities || []).length || existing.vetHealthId);
        if (!trimmed && !hasOtherContent) {
          return { ...prev, weeklyPlans: weeklyPlans.filter((_, idx) => idx !== i) };
        }
        return {
          ...prev,
          weeklyPlans: weeklyPlans.map((p, idx) => (idx === i ? { ...existing, note: trimmed } : p)),
        };
      });
    },
    [updateData]
  );

  // Toggles one activity id in/out of a weekly-plan cell's completed set. No-ops if the id
  // isn't currently assigned to that cell (the UI only ever offers currently-assigned
  // activities, so this is a defensive guard, not an expected path).
  const toggleWeeklyPlanCompleted = useCallback(
    (hid, date, activityId) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const i = weeklyPlans.findIndex((p) => p.hid === hid && p.date === date);
        if (i < 0) return prev;
        const existing = weeklyPlans[i];
        if (!(existing.activities || []).includes(activityId)) return prev;
        const completed = existing.completed || [];
        const nextCompleted = completed.includes(activityId)
          ? completed.filter((c) => c !== activityId)
          : [...completed, activityId];
        return {
          ...prev,
          weeklyPlans: weeklyPlans.map((p, idx) => (idx === i ? { ...existing, completed: nextCompleted } : p)),
        };
      });
    },
    [updateData]
  );

  // Copies one weekly-plan cell's activities + note into one or more target cells.
  // Deliberately does not copy completed-state (always starts un-done, matching the
  // reference behavior this ports the interaction from) or vetHealthId (a pasted VET flag
  // needs its own fresh detail, not a duplicate reference to the source's health record).
  // One updateData call handles a single-cell paste, a whole-day paste, and a whole-
  // horse-row paste — the caller just passes more/fewer targets.
  const pasteWeeklyPlanContent = useCallback(
    (sourceHid, sourceDate, targets) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const source = weeklyPlans.find((p) => p.hid === sourceHid && p.date === sourceDate);
        const activities = source ? [...(source.activities || [])] : [];
        const note = source ? source.note || "" : "";
        if (!activities.length && !note) return prev;
        let next = weeklyPlans;
        (targets || []).forEach(({ hid, date }) => {
          const i = next.findIndex((p) => p.hid === hid && p.date === date);
          const rec = {
            id: i >= 0 ? next[i].id || uid() : uid(),
            hid,
            date,
            activities: [...activities],
            completed: [],
            note,
            vetHealthId: null,
          };
          next = i >= 0 ? next.map((p, idx) => (idx === i ? rec : p)) : [...next, rec];
        });
        return { ...prev, weeklyPlans: next };
      });
    },
    [updateData]
  );

  // For every weekly-plan cell in the 7 days before weekStart that had content, writes that
  // same activities+note into the corresponding day this week (date shifted +7). Only
  // writes cells that had source content — never touches a cell whose corresponding source
  // day was empty, even if that cell already has different content today.
  const repeatPreviousWeek = useCallback(
    (weekStart) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const prevWeekStart = addD(weekStart, -7);
        const prevWeekDates = new Set(Array.from({ length: 7 }, (_, i) => addD(prevWeekStart, i)));
        const sourceRows = weeklyPlans.filter(
          (p) => prevWeekDates.has(p.date) && ((p.activities || []).length || p.note)
        );
        let next = weeklyPlans;
        sourceRows.forEach((source) => {
          const targetDate = addD(source.date, 7);
          const i = next.findIndex((p) => p.hid === source.hid && p.date === targetDate);
          const rec = {
            id: i >= 0 ? next[i].id || uid() : uid(),
            hid: source.hid,
            date: targetDate,
            activities: [...(source.activities || [])],
            completed: [],
            note: source.note || "",
            vetHealthId: null,
          };
          next = i >= 0 ? next.map((p, idx) => (idx === i ? rec : p)) : [...next, rec];
        });
        return { ...prev, weeklyPlans: next };
      });
    },
    [updateData]
  );

  // Fully wipes one weekly-plan cell (activities, completed, note, vet link). Does NOT
  // delete the linked Health record if one exists — clearing a board cell shouldn't erase
  // real health history, only the board's reference to it.
  const eraseWeeklyPlanCell = useCallback(
    (hid, date) => {
      updateData((prev) => ({
        ...prev,
        weeklyPlans: (prev.weeklyPlans || []).filter((p) => !(p.hid === hid && p.date === date)),
      }));
    },
    [updateData]
  );

  // Links a weekly-plan cell to the Health record its VET detail was saved into. The
  // caller (the board's VET detail sheet) calls addHealthRecord/updateHealthRecord itself,
  // then this, rather than this mutator duplicating that logic — updateData's existing
  // debounce coalesces the two writes into one Firestore write in practice. Assumes the
  // cell row already exists (the VET activity must already be assigned before its detail
  // sheet can open) — a no-op if not.
  const setWeeklyPlanVetLink = useCallback(
    (hid, date, healthId) => {
      updateData((prev) => {
        const weeklyPlans = prev.weeklyPlans || [];
        const i = weeklyPlans.findIndex((p) => p.hid === hid && p.date === date);
        if (i < 0) return prev;
        return {
          ...prev,
          weeklyPlans: weeklyPlans.map((p, idx) => (idx === i ? { ...p, vetHealthId: healthId } : p)),
        };
      });
    },
    [updateData]
  );

  // Ports setBoardPeriodic (public/legacy-app.js:1311-1317).
  const setBoardPeriodic = useCallback(
    (hid, columnId, date) => {
      updateData((prev) => {
        const periodicBoardDates = prev.periodicBoardDates || [];
        const i = periodicBoardDates.findIndex((r) => r.hid === hid && r.columnId === columnId);
        let next;
        if (date) {
          const rec = { hid, columnId, date };
          next = i >= 0 ? periodicBoardDates.map((r, idx) => (idx === i ? rec : r)) : [...periodicBoardDates, rec];
        } else {
          next = i >= 0 ? periodicBoardDates.filter((_, idx) => idx !== i) : periodicBoardDates;
        }
        return { ...prev, periodicBoardDates: next };
      });
    },
    [updateData]
  );

  // Ports assignBoardHorse (public/legacy-app.js:1416-1423). Validation/occupied/conflict
  // outcomes are returned as a status for the caller to toast/confirm on, rather than
  // calling toast()/confirm() here directly (same split used throughout this context).
  // Pass { force: true } to place anyway after the caller confirms a reported conflict.
  const assignBoardHorse = useCallback(
    (hid, type, date, resourceId, slotId, position, { force } = {}) => {
      if (!hid) throw new Error("Selecciona un caballo");
      const occupied = boardAssignment(data.boardAssignments, type, date, resourceId, slotId, position);
      if (occupied) return { status: "occupied" };
      const conflict = horseConflict(data.boardConfig, data.boardAssignments, hid, date, type, slotId);
      if (conflict && !force) return { status: "conflict" };
      updateData((prev) => ({
        ...prev,
        boardAssignments: [
          ...(prev.boardAssignments || []),
          { id: uid(), type, date, resourceId, slotId, position: Number(position), hid },
        ],
      }));
      return { status: "ok" };
    },
    [data.boardAssignments, data.boardConfig, updateData]
  );

  // Ports moveBoardAssignment (public/legacy-app.js:1416-1423). Fix: also runs the same
  // horseConflict check assignBoardHorse does — legacy's version skips it, so dragging an
  // already-placed horse into a time-overlapping slot bypassed the warning a fresh
  // placement of the same horse into the same slot would show. The moved assignment itself
  // is excluded from the conflict check so its own pre-move slot isn't compared against
  // itself.
  const moveBoardAssignment = useCallback(
    (id, type, date, resourceId, slotId, position, { force } = {}) => {
      const a = (data.boardAssignments || []).find((x) => x.id === id);
      if (!a) return { status: "not-found" };
      const occupied = boardAssignment(data.boardAssignments, type, date, resourceId, slotId, position);
      if (occupied && occupied.id !== id) return { status: "occupied" };
      const others = (data.boardAssignments || []).filter((x) => x.id !== id);
      const conflict = horseConflict(data.boardConfig, others, a.hid, date, type, slotId);
      if (conflict && !force) return { status: "conflict" };
      updateData((prev) => ({
        ...prev,
        boardAssignments: (prev.boardAssignments || []).map((x) =>
          x.id === id ? { ...x, type, date, resourceId, slotId, position: Number(position) } : x
        ),
      }));
      return { status: "ok" };
    },
    [data.boardAssignments, data.boardConfig, updateData]
  );

  // Ports removeBoardAssignment (public/legacy-app.js:1416-1423).
  const removeBoardAssignment = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardAssignments: (prev.boardAssignments || []).filter((a) => a.id !== id),
      }));
    },
    [updateData]
  );

  // Ports addBoardActivity/deleteBoardActivity/addPeriodicColumn/deletePeriodicColumn
  // (public/legacy-app.js:1457-1460). Legacy has no edit for either of these, only add and
  // delete, so neither gets an update mutator. Deleting one has no cascade cleanup of
  // weeklyPlans/periodicBoardDates that reference it — matches legacy's intentional design,
  // confirmed by its own confirm-dialog text ("Las fechas guardadas dejarán de mostrarse").
  const addBoardActivity = useCallback(
    (code, label) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          activities: [...prev.boardConfig.activities, { id: safeBoardId("act", label), code, label, tone: "blue" }],
        },
      }));
    },
    [updateData]
  );

  const deleteBoardActivity = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: { ...prev.boardConfig, activities: prev.boardConfig.activities.filter((x) => x.id !== id) },
      }));
    },
    [updateData]
  );

  const addPeriodicColumn = useCallback(
    (label) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          periodicColumns: [...prev.boardConfig.periodicColumns, { id: safeBoardId("periodic", label), label, tone: "blue" }],
        },
      }));
    },
    [updateData]
  );

  const deletePeriodicColumn = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          periodicColumns: prev.boardConfig.periodicColumns.filter((x) => x.id !== id),
        },
      }));
    },
    [updateData]
  );

  // Ports addWalker/editWalker/deleteWalker (public/legacy-app.js:1462-1464). Fix: slots
  // are taken as given from the caller (the per-row array editor built in Phase 6e), which
  // preserves each existing row's id — unlike legacy's promptSlots, which re-parses a
  // retyped "HH:MM-HH:MM, ..." string and mints a fresh id for every row on every edit,
  // silently orphaning any boardAssignments that referenced the old ids.
  const addWalker = useCallback(
    (name, capacity, slots) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          walkers: [...prev.boardConfig.walkers, { id: safeBoardId("walker", name), name, capacity, slots }],
        },
      }));
    },
    [updateData]
  );

  const updateWalker = useCallback(
    (id, { name, capacity, slots }) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          walkers: prev.boardConfig.walkers.map((w) => (w.id === id ? { ...w, name, capacity, slots } : w)),
        },
      }));
    },
    [updateData]
  );

  const deleteWalker = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: { ...prev.boardConfig, walkers: prev.boardConfig.walkers.filter((x) => x.id !== id) },
        boardAssignments: (prev.boardAssignments || []).filter((a) => a.resourceId !== id),
      }));
    },
    [updateData]
  );

  // Ports addPaddock/deletePaddock (public/legacy-app.js:1465-1466).
  const addPaddock = useCallback(
    (name) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          paddocks: [...prev.boardConfig.paddocks, { id: safeBoardId("paddock", name), name, capacity: 1 }],
        },
      }));
    },
    [updateData]
  );

  const deletePaddock = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: { ...prev.boardConfig, paddocks: prev.boardConfig.paddocks.filter((x) => x.id !== id) },
        boardAssignments: (prev.boardAssignments || []).filter((a) => a.resourceId !== id),
      }));
    },
    [updateData]
  );

  // Ports addPaddockSlot/deletePaddockSlot (public/legacy-app.js:1467-1468). Legacy's
  // addPaddockSlot parses a comma-separated list from promptSlots and can add several at
  // once; here the caller's form adds one slot at a time, so this takes a single
  // start/end pair instead of an array — the same prompt()-to-form adaptation used
  // throughout this migration. The shared list stays sorted by start time either way.
  const addPaddockSlot = useCallback(
    (start, end) => {
      updateData((prev) => {
        const paddockSlots = [...prev.boardConfig.paddockSlots, { id: uid(), start, end }].sort((a, b) =>
          a.start.localeCompare(b.start)
        );
        return { ...prev, boardConfig: { ...prev.boardConfig, paddockSlots } };
      });
    },
    [updateData]
  );

  const deletePaddockSlot = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        boardConfig: {
          ...prev.boardConfig,
          paddockSlots: prev.boardConfig.paddockSlots.filter((x) => x.id !== id),
        },
        boardAssignments: (prev.boardAssignments || []).filter((a) => a.slotId !== id),
      }));
    },
    [updateData]
  );

  // Ports the write side of confirmSmartOrder (public/legacy-app.js:3095-3109): builds one
  // tasks/health/expenses record per confirmed draft item and writes them all in a single
  // updateData call (same batching precedent as applyTemplate). The caller is expected to
  // have already filtered `items` down to the ones the user checked and is allowed to
  // create — this mutator just builds records from whatever it's given, same split used
  // throughout this context. Unlike the regular health form, a health item here never
  // auto-creates a linked expense: legacy's own smartAnalyzeOrder already emits a separate
  // sibling 'expense' draft item when an amount was detected, so the two stay independent
  // records here too.
  const confirmSmartOrderDraft = useCallback(
    (items) => {
      let created = 0;
      const batch = writeBatch(db);
      (items || []).forEach((x) => {
        if (x.kind === "task") {
          const id = uid();
          batch.set(
            stableDoc(stableId, "tasks", id),
            cleanForFirestore({
              id,
              stableId,
              horseId: x.hid,
              activity: x.activity,
              startDate: x.date,
              time: null,
              dur: Number(x.dur) || 30,
              assignedTo: x.pid || null,
              notes: x.notes || "",
              status: "pending",
            })
          );
          created++;
        } else if (x.kind === "health") {
          const id = uid();
          batch.set(
            stableDoc(stableId, "horses", x.hid, "health", id),
            cleanForFirestore({
              id,
              stableId,
              hid: x.hid,
              type: x.type || "otro",
              label: x.label || "Registro sanitario",
              date: x.date,
              nxt: null,
              notes: x.notes || "",
              amount: Number(x.amount) || 0,
              payStatus: x.payStatus || "pendiente",
              payee: x.payee || "",
            })
          );
          created++;
        } else if (x.kind === "expense") {
          const id = uid();
          batch.set(
            stableDoc(stableId, "horses", x.hid, "expenses", id),
            cleanForFirestore({
              id,
              stableId,
              hid: x.hid,
              concept: x.concept || "Gasto",
              amount: Number(x.amount) || 0,
              date: x.date,
              cat: x.cat || "vet",
              payer: x.payer || "Cuadra",
              payee: x.payee || "",
              status: x.status || "pendiente",
              notes: x.notes || "",
            })
          );
          created++;
        }
      });
      batch.commit();
      return created;
    },
    [stableId]
  );

  const value = useMemo(
    () => ({
      ...data,
      horses,
      trainings,
      health,
      expenses,
      healthDocs,
      team,
      tasks,
      sessionAlerts,
      loading,
      error,
      updateData,
      addHorse,
      updateHorse,
      deleteHorse,
      reorderHorses,
      addTraining,
      deleteTraining,
      addHealthRecord,
      updateHealthRecord,
      deleteHealthRecord,
      addHealthDocLink,
      uploadHealthDocs,
      deleteHealthDoc,
      addExpense,
      updateExpense,
      deleteExpense,
      addExpenseSettlement,
      updateHorseSale,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      answerSessionAlert,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      applyTemplate,
      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      toggleAbsence,
      addStableTask,
      updateStableTask,
      deleteStableTask,
      doneStableTask,
      addStableExpense,
      updateStableExpense,
      deleteStableExpense,
      setWeeklyPlanActivities,
      toggleWeeklyPlanActivity,
      setWeeklyPlanNote,
      toggleWeeklyPlanCompleted,
      pasteWeeklyPlanContent,
      repeatPreviousWeek,
      eraseWeeklyPlanCell,
      setWeeklyPlanVetLink,
      setBoardPeriodic,
      assignBoardHorse,
      moveBoardAssignment,
      removeBoardAssignment,
      addBoardActivity,
      deleteBoardActivity,
      addPeriodicColumn,
      deletePeriodicColumn,
      addWalker,
      updateWalker,
      deleteWalker,
      addPaddock,
      deletePaddock,
      addPaddockSlot,
      deletePaddockSlot,
      confirmSmartOrderDraft,
    }),
    [
      data,
      horses,
      trainings,
      health,
      expenses,
      healthDocs,
      team,
      tasks,
      sessionAlerts,
      loading,
      error,
      updateData,
      addHorse,
      updateHorse,
      deleteHorse,
      reorderHorses,
      addTraining,
      deleteTraining,
      addHealthRecord,
      updateHealthRecord,
      deleteHealthRecord,
      addHealthDocLink,
      uploadHealthDocs,
      deleteHealthDoc,
      addExpense,
      updateExpense,
      deleteExpense,
      addExpenseSettlement,
      updateHorseSale,
      addTask,
      updateTask,
      deleteTask,
      cycleTaskStatus,
      answerSessionAlert,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      applyTemplate,
      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      toggleAbsence,
      addStableTask,
      updateStableTask,
      deleteStableTask,
      doneStableTask,
      addStableExpense,
      updateStableExpense,
      deleteStableExpense,
      setWeeklyPlanActivities,
      toggleWeeklyPlanActivity,
      setWeeklyPlanNote,
      toggleWeeklyPlanCompleted,
      pasteWeeklyPlanContent,
      repeatPreviousWeek,
      eraseWeeklyPlanCell,
      setWeeklyPlanVetLink,
      setBoardPeriodic,
      assignBoardHorse,
      moveBoardAssignment,
      removeBoardAssignment,
      addBoardActivity,
      deleteBoardActivity,
      addPeriodicColumn,
      deletePeriodicColumn,
      addWalker,
      updateWalker,
      deleteWalker,
      addPaddock,
      deletePaddock,
      addPaddockSlot,
      deletePaddockSlot,
      confirmSmartOrderDraft,
    ]
  );

  return (
    <StableDataContext.Provider value={value}>
      {children}
    </StableDataContext.Provider>
  );
}
