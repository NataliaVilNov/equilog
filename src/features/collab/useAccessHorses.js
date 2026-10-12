import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebaseClient.js";

// Lee los caballos de un acceso UNO A UNO, por ruta directa. No usa una consulta a la
// colección a propósito: las reglas no permiten a un colaborador listar `horses`, porque para
// autorizar un list Firestore exige demostrar la regla con los filtros de la consulta, y "los
// caballos que me marcaron" no es un dato que viva en el documento del caballo.
//
// Son dos o tres caballos por cuadra, así que leerlos sueltos no es problema.
export function useAccessHorses(stableId, horseIds) {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(false);
  const key = (horseIds || []).join(",");

  useEffect(() => {
    if (!stableId || !key) {
      setHorses([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const ids = key.split(",");
    Promise.all(
      ids.map(async (hid) => {
        try {
          const snap = await getDoc(doc(db, "stables", stableId, "horses", hid));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        } catch (_e) {
          return null;
        }
      })
    ).then((list) => {
      if (!cancelled) {
        setHorses(list.filter(Boolean));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stableId, key]);

  return { horses, loading };
}

// La salud de un caballo concreto. Misma razón que arriba: ruta directa, sin collectionGroup.
export function useHorseHealth(stableId, hid) {
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!stableId || !hid) {
      setHealth([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDocs(collection(db, "stables", stableId, "horses", hid, "health"))
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setHealth(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stableId, hid, reloadKey]);

  return { health, loading, reload: () => setReloadKey((k) => k + 1) };
}