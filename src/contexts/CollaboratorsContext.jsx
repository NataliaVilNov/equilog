import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseClient.js";
import { accessDocId, pendingAccessDocId } from "../lib/collaboratorTypes.js";
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
  // Canjea un código de colaborador. Lo llama joinByCode cuando el código no está en
  // inviteCodes, así que quien ejecuta esto NO es el administrador, es el propio colaborador.
  //
  // El documento pendiente se nombra con el código, y por eso cualquiera que lo tenga puede
  // ir a esa ruta exacta y leerlo. Ahí está la prueba de que se lo dieron: la colección no se
  // puede listar, igual que inviteCodes.
  //
  // Se crea el definitivo ANTES de borrar el pendiente. Si fallara el borrado, queda una
  // invitación huérfana que el administrador puede quitar a mano; al revés se perdería el
  // acceso entero sin forma de recuperarlo.
  const redeemCollaboratorCode = useCallback(
    async (rawCode) => {
      if (!user) throw new Error("Inicia sesión primero");
      const code = (rawCode || "").trim().toUpperCase();
      const pendingRef = doc(db, "access", pendingAccessDocId(code));
      const snap = await getDoc(pendingRef);
      if (!snap.exists()) return null;
      const d = snap.data() || {};
      if (d.status !== "pending" || !d.stableId) return null;

      const finalId = accessDocId(d.stableId, user.uid);
      await setDoc(doc(db, "access", finalId), {
        status: "active",
        redeemedCode: code,
        stableId: d.stableId,
        stableName: d.stableName || "",
        type: d.type || "other",
        name: d.name || "",
        email: (user.email || d.email || "").toLowerCase(),
        horseIds: d.horseIds || [],
        uid: user.uid,
        invitedBy: d.invitedBy || null,
        invitedAt: d.invitedAt || null,
        acceptedAt: new Date().toISOString(),
      });
      try {
        await deleteDoc(pendingRef);
      } catch (_e) {
        // non-fatal: el acceso ya está creado
      }
      return { stableId: d.stableId, stableName: d.stableName || "", type: d.type || "other" };
    },
    [user]
  );

  const removeCollaborator = useCallback(async (accessId) => {
    await deleteDoc(doc(db, "access", accessId));
  }, []);

   const value = useMemo(
    () => ({
      collaborators,
      inviteCollaborator,
      setCollaboratorHorses,
      removeCollaborator,
      redeemCollaboratorCode,
    }),
    [
      collaborators,
      inviteCollaborator,
      setCollaboratorHorses,
      removeCollaborator,
      redeemCollaboratorCode,
    ]
  );

  return <CollaboratorsContext.Provider value={value}>{children}</CollaboratorsContext.Provider>;
}

export function useCollaborators() {
  return useContext(CollaboratorsContext) || {};
}