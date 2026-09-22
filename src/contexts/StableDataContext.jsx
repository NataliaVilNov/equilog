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
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../lib/firebaseClient.js";
import { catFromHealthType, activityById } from "../lib/constants.js";
import { taskNeedsReturn } from "../features/tasks/taskHelpers.js";
import { boardDefaults } from "../features/boards/boardDefaults.js";
import { uid } from "../lib/id.js";
import { td } from "../lib/date.js";

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
  }
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

  // Ports the training portion of save-training-btn (public/legacy-app.js:3648-3651) and
  // the training-delete inline handler in the "entrenos" tab (public/legacy-app.js:1707).
  // No update mutator — legacy has no training-edit UI.
  const addTraining = useCallback(
    (training) => {
      updateData((prev) => ({ ...prev, trainings: [...prev.trainings, training] }));
    },
    [updateData]
  );

  const deleteTraining = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        trainings: prev.trainings.filter((t) => t.id !== id),
      }));
    },
    [updateData]
  );

  // Ports the health portion of save-health-btn (public/legacy-app.js:3644-3665): adding or
  // editing a health record with amount > 0 auto-creates/updates a linked expense entry.
  const addHealthRecord = useCallback(
    (record) => {
      updateData((prev) => {
        const health = [...prev.health, record];
        let expenses = prev.expenses;
        if (Number(record.amount) > 0) {
          expenses = [
            ...expenses,
            {
              id: uid(),
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
            },
          ];
        }
        return { ...prev, health, expenses };
      });
    },
    [updateData]
  );

  const updateHealthRecord = useCallback(
    (record) => {
      updateData((prev) => {
        const health = prev.health.map((r) => (r.id === record.id ? record : r));
        const linked = prev.expenses.find((e) => e.healthId === record.id);
        const amount = Number(record.amount) || 0;
        let expenses = prev.expenses;
        if (linked && amount > 0) {
          expenses = prev.expenses.map((e) =>
            e.id === linked.id
              ? {
                  ...e,
                  amount: record.amount,
                  status: record.payStatus,
                  payee: record.payee,
                  concept: record.label || record.type,
                }
              : e
          );
        } else if (!linked && amount > 0) {
          expenses = [
            ...expenses,
            {
              id: uid(),
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
            },
          ];
        }
        return { ...prev, health, expenses };
      });
    },
    [updateData]
  );

  const deleteHealthRecord = useCallback(
    (id) => {
      updateData((prev) => ({ ...prev, health: prev.health.filter((r) => r.id !== id) }));
    },
    [updateData]
  );

  // Ports addHealthDocLink (public/legacy-app.js:1116-1130).
  const addHealthDocLink = useCallback(
    ({ hid, category, date, notes, title, url, userId }) => {
      const horse = data.horses.find((x) => x.id === hid);
      const doc = {
        id: uid(),
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
      updateData((prev) => ({ ...prev, healthDocs: [...(prev.healthDocs || []), doc] }));
    },
    [updateData, data.horses]
  );

  // Ports uploadHealthDocs (public/legacy-app.js:1132-1176): uploads every file to Firebase
  // Storage, then pushes all resulting doc records in one updateData call (matching
  // legacy's single loop + one save()), reporting progress via onProgress(label, pct).
  const uploadHealthDocs = useCallback(
    async ({ hid, files, category, date, notes, userId, onProgress }) => {
      const horse = data.horses.find((x) => x.id === hid);
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
      updateData((prev) => ({ ...prev, healthDocs: [...(prev.healthDocs || []), ...added] }));
      return added;
    },
    [updateData, data.horses, stableId]
  );

  // Ports deleteHealthDoc (public/legacy-app.js:1177-1188).
  const deleteHealthDoc = useCallback(
    async (id) => {
      const doc = (data.healthDocs || []).find((x) => x.id === id);
      if (!doc) return;
      if (doc.path) {
        try {
          await deleteObject(storageRef(storage, doc.path));
        } catch (_e) {
          // non-fatal, mirrors legacy behavior
        }
      }
      updateData((prev) => ({
        ...prev,
        healthDocs: (prev.healthDocs || []).filter((x) => x.id !== id),
      }));
    },
    [updateData, data.healthDocs]
  );

  // Ports the expense-save handler (public/legacy-app.js:3713-3730) and deleteExpense
  // (public/legacy-app.js:2132-2143 — deliberately doesn't touch a linked health record,
  // matching the legacy comment there).
  const addExpense = useCallback(
    (expense) => {
      updateData((prev) => ({ ...prev, expenses: [...prev.expenses, expense] }));
    },
    [updateData]
  );

  const updateExpense = useCallback(
    (expense) => {
      updateData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === expense.id ? expense : e)),
      }));
    },
    [updateData]
  );

  const deleteExpense = useCallback(
    (id) => {
      updateData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    },
    [updateData]
  );

  // Ports confirmExpenseSettlement (public/legacy-app.js:969-976): records the settlement
  // and marks every settled expense.
  const addExpenseSettlement = useCallback(
    (settlement) => {
      updateData((prev) => ({
        ...prev,
        expenseSettlements: [...(prev.expenseSettlements || []), settlement],
        expenses: prev.expenses.map((e) =>
          settlement.expenseIds.includes(e.id)
            ? { ...e, settled: true, settlementId: settlement.id, settledDate: settlement.date }
            : e
        ),
      }));
    },
    [updateData]
  );

  // Ports saleUpdate/saleOwnerUpdate/saleAddOwner/saleRemoveOwner
  // (public/legacy-app.js:3584-3614) as one generic mutator: the venta tab has no separate
  // save button in legacy either — every field writes straight through, debounced same as
  // everything else.
  const updateHorseSale = useCallback(
    (hid, updater) => {
      updateData((prev) => ({
        ...prev,
        horses: prev.horses.map((h) => {
          if (h.id !== hid) return h;
          const currentSale = h.sale || { precio: 0, owners: [{ nombre: "", pct: 100 }] };
          const nextSale = typeof updater === "function" ? updater(currentSale) : { ...currentSale, ...updater };
          return { ...h, sale: nextSale };
        }),
      }));
    },
    [updateData]
  );

  // Ports the task-save handler (public/legacy-app.js:3669-3676) and its inline delete
  // handler (public/legacy-app.js:3274, which also clears any salerts tied to the task).
  const addTask = useCallback(
    (task) => {
      updateData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    },
    [updateData]
  );

  const updateTask = useCallback(
    (task) => {
      updateData((prev) => ({ ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? task : t)) }));
    },
    [updateData]
  );

  const deleteTask = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        salerts: prev.salerts.filter((s) => s.tid !== id),
      }));
    },
    [updateData]
  );

  // Ports cycleTask (public/legacy-app.js:3226-3242): cycling a task to "done" auto-creates
  // a pending session-report alert for activities that require one (AK[].r); cycling away
  // from "done" removes any unanswered alert it created.
  const cycleTaskStatus = useCallback(
    (id) => {
      updateData((prev) => {
        const task = prev.tasks.find((t) => t.id === id);
        if (!task) return prev;
        let nextStatus;
        if (taskNeedsReturn(task.activity)) {
          nextStatus = { pending: "inprogress", inprogress: "done", done: "pending" }[task.status] || "pending";
        } else {
          nextStatus = task.status === "done" ? "pending" : "done";
        }
        const tasks = prev.tasks.map((t) => (t.id === id ? { ...t, status: nextStatus } : t));
        let salerts = prev.salerts;
        if (nextStatus === "done") {
          const activity = activityById(task.activity);
          if (activity.r && !salerts.some((s) => s.tid === id && !s.ans)) {
            const horse = prev.horses.find((h) => h.id === task.hid);
            salerts = [
              ...salerts,
              {
                id: uid(),
                tid: id,
                hid: task.hid,
                hn: horse ? horse.name : "",
                act: task.activity,
                date: task.date,
                pid: task.pid,
                ans: false,
              },
            ];
          }
        } else {
          salerts = salerts.filter((s) => !(s.tid === id && !s.ans));
        }
        return { ...prev, tasks, salerts };
      });
    },
    [updateData]
  );

  // Ports the save-session-btn handler (public/legacy-app.js:3706-3712): answering a
  // pending session-report alert creates a new training record and marks the alert
  // answered, in one atomic action (legacy treats it as one user action, not two).
  const answerSessionAlert = useCallback(
    (alertId, sessionData) => {
      updateData((prev) => {
        const alert = prev.salerts.find((s) => s.id === alertId);
        if (!alert) return prev;
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
        return {
          ...prev,
          trainings: [...prev.trainings, training],
          salerts: prev.salerts.map((s) => (s.id === alertId ? { ...s, ans: true } : s)),
        };
      });
    },
    [updateData]
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
      updateData((prev) => {
        const tpl = prev.templates.find((t) => t.id === templateId);
        if (!tpl) return prev;
        const newTasks = tpl.tasks.map((t) => ({
          id: uid(),
          hid: t.hid,
          activity: t.activity,
          pid: t.pid,
          dur: t.dur,
          date,
          status: "pending",
          notes: "",
          time: null,
        }));
        return { ...prev, tasks: [...prev.tasks, ...newTasks] };
      });
    },
    [updateData]
  );

  // Ports save-member-btn (public/legacy-app.js:3677-3685) and the inline delete handler
  // in rMF (public/legacy-app.js:3416), which also nulls out `pid` on any task assigned to
  // the deleted member rather than leaving it dangling.
  const addTeamMember = useCallback(
    (member) => {
      updateData((prev) => ({ ...prev, team: [...prev.team, member] }));
    },
    [updateData]
  );

  const updateTeamMember = useCallback(
    (member) => {
      updateData((prev) => ({ ...prev, team: prev.team.map((m) => (m.id === member.id ? member : m)) }));
    },
    [updateData]
  );

  const deleteTeamMember = useCallback(
    (id) => {
      updateData((prev) => ({
        ...prev,
        team: prev.team.filter((m) => m.id !== id),
        tasks: prev.tasks.map((t) => (t.pid === id ? { ...t, pid: null } : t)),
      }));
    },
    [updateData]
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
        let next;
        if (activities.length) {
          const rec = { id: i >= 0 ? weeklyPlans[i].id || uid() : uid(), hid, date, activities };
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
          return { ...prev, weeklyPlans: [...weeklyPlans, { id: uid(), hid, date, activities: [activityId] }] };
        }
        const existing = weeklyPlans[i];
        const activities = Array.isArray(existing.activities) ? existing.activities : [];
        const nextActivities = activities.includes(activityId)
          ? activities.filter((a) => a !== activityId)
          : [...activities, activityId];
        return {
          ...prev,
          weeklyPlans: weeklyPlans.map((p, pi) => (pi === i ? { ...existing, activities: nextActivities } : p)),
        };
      });
    },
    [updateData]
  );

  const value = useMemo(
    () => ({
      ...data,
      loading,
      error,
      updateData,
      addHorse,
      updateHorse,
      deleteHorse,
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
    }),
    [
      data,
      loading,
      error,
      updateData,
      addHorse,
      updateHorse,
      deleteHorse,
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
    ]
  );

  return (
    <StableDataContext.Provider value={value}>
      {children}
    </StableDataContext.Provider>
  );
}
