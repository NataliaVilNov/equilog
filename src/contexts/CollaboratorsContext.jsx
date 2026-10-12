import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseClient.js";
import { pendingAccessDocId } from "../lib/collaboratorTypes.js";
import { AuthContext } from "./AuthContext.jsx";
import { StableSelectionContext } from "./StableSelectionContext.jsx";

export const CollaboratorsContext = createContext(null);

// Los colaboradores viven en la colección `access` de nivel superior, no dentro de la cuadra.
// El motivo: una veterinaria necesita ver TODAS sus cuadras de una vez, y para encontrarlas
// tendría que saber de antemano en cuáles está. Con access de nivel superior le basta una
// consulta por su propio uid.
//
// Por eso esto es un contexto aparte y no va en StableDataContext, que solo sabe leer
// colecciones de dentro de una cuadra concreta.
export function CollaboratorsProvider({ children }) {
  const { user } = useContext(AuthContext) || {};
  const { activeStable } = useContext(StableSelectionContext) || {};
  const stableId = activeStable ? activeStable.id : null;

  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!stableId || !user) {
      setCollaborators([]);
      return;
    }
    const q = query(collection(db, "access"), where("stableId", "==", stableId));
    return onSnapshot(
      q,
      (snap) => setCollaborators(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setCollaborators([])
    );
  }, [stableId, user]);

  // Crea la invitación. Todavía no hay uid de la otra persona, así que el documento se
  // nombra con el código y queda en estado "pending". Al aceptarlo se creará el definitivo.
  const inviteCollaborator = useCallback(
    async ({ type, name, email, horseIds }) => {
      if (!user || !stableId) throw new Error("No hay cuadra activa");
      if (!(horseIds || []).length) throw new Error("Marca al menos un caballo");
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      await setDoc(doc(db, "access", pendingAccessDocId(code)), {
        status: "pending",
        code,
        stableId,
        stableName: activeStable.name || "",
        type,
        name: (name || "").trim(),
        email: (email || "").trim().toLowerCase(),
        horseIds,
        uid: null,
        invitedBy: user.uid,
        invitedAt: new Date().toISOString(),
      });
      return code;
    },
    [user, stableId, activeStable]
  );

  const setCollaboratorHorses = useCallback(async (accessId, horseIds) => {
    await updateDoc(doc(db, "access", accessId), { horseIds });
  }, []);

  const removeCollaborator = useCallback(async (accessId) => {
    await deleteDoc(doc(db, "access", accessId));
  }, []);

  const value = useMemo(
    () => ({ collaborators, inviteCollaborator, setCollaboratorHorses, removeCollaborator }),
    [collaborators, inviteCollaborator, setCollaboratorHorses, removeCollaborator]
  );

  return <CollaboratorsContext.Provider value={value}>{children}</CollaboratorsContext.Provider>;
}

export function useCollaborators() {
  return useContext(CollaboratorsContext) || {};
}