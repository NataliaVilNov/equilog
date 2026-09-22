import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  or,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebaseClient.js";
import { deleteStableCascade } from "../lib/deleteStableCascade.js";
import { canManageStable } from "../lib/permissions.js";
import { boardDefaults } from "../features/boards/boardDefaults.js";
import { AuthContext } from "./AuthContext.jsx";

export const StableSelectionContext = createContext(null);

const EMPTY_STABLE_DATA = {};

export function StableSelectionProvider({ children }) {
  const { user, profile } = useContext(AuthContext) || {};
  const [stables, setStables] = useState([]);
  const [activeStableId, setActiveStableId] = useState(null);
  const [activeStable, setActiveStable] = useState(null);
  const [pendingJoin, setPendingJoin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ports renderStableList's data fetch (public/legacy-app.js:334-365), minus the DOM
  // rendering, which is now StableListScreen's job.
  const refreshStables = useCallback(async () => {
    if (!user) {
      setStables([]);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "stables"),
        where("memberIds", "array-contains", user.uid)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setStables(list);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Ports _fbSwitchStable (public/legacy-app.js:367-427), minus D loading and legacy
  // screen switching — StableDataContext reacts to activeStableId, and routing owns
  // which screen is shown.
  const switchStable = useCallback(
    async (stableId) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, "stables", stableId));
        if (!snap.exists()) {
          await setDoc(doc(db, "users", user.uid), { lastStable: null }, { merge: true });
          setActiveStableId(null);
          setActiveStable(null);
          setError(new Error("La cuadra ya no existe o fue eliminada"));
          return;
        }
        const stableData = snap.data();
        if (!(stableData.memberIds || []).includes(user.uid)) {
          await setDoc(doc(db, "users", user.uid), { lastStable: null }, { merge: true });
          setActiveStableId(null);
          setActiveStable(null);
          setError(new Error("Ya no perteneces a esa cuadra"));
          return;
        }
        await setDoc(doc(db, "users", user.uid), { lastStable: stableId }, { merge: true });
        setActiveStableId(stableId);
        setActiveStable({ id: stableId, ...stableData });
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Ports the "if(profile.lastStable) _fbSwitchStable(profile.lastStable)" branch of
  // onAuthStateChanged (former src/firebase.js:28-38, deleted in the Phase 8c cutover).
  // Nothing else in the React port re-selects a returning user's last-used stable — without
  // this, every login lands on the stable list with no stable chosen. Runs once per signed-in
  // user (tracked by uid), not on every render, so it doesn't fight a manual switchStable/
  // exitActiveStable call later in the same session.
  const autoSelectedForUid = useRef(null);
  useEffect(() => {
    if (!user) {
      autoSelectedForUid.current = null;
      return;
    }
    if (!profile || autoSelectedForUid.current === user.uid) return;
    autoSelectedForUid.current = user.uid;
    if (profile.lastStable) switchStable(profile.lastStable);
  }, [user, profile, switchStable]);

  // Ports doCreateStable (public/legacy-app.js:464-492).
  const createStable = useCallback(
    async ({ name, description }) => {
      if (!user || !name || !name.trim()) throw new Error("El nombre es obligatorio");
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const stableRef = await addDoc(collection(db, "stables"), {
        name: name.trim(),
        description: (description || "").trim(),
        ownerId: user.uid,
        memberIds: [user.uid],
        members: {
          [user.uid]: {
            name: (profile && profile.name) || user.displayName || "",
            email: user.email,
            role: "admin",
            joined: new Date().toISOString(),
          },
        },
        inviteCode,
        created: serverTimestamp(),
      });
      await setDoc(doc(db, "stables", stableRef.id, "data", "main"), EMPTY_STABLE_DATA);
      await setDoc(doc(db, "stables", stableRef.id, "boardConfig", "main"), boardDefaults());
      await setDoc(doc(db, "inviteCodes", inviteCode), {
        stableId: stableRef.id,
        name: name.trim(),
        created: serverTimestamp(),
      });
      await switchStable(stableRef.id);
      return stableRef.id;
    },
    [user, profile, switchStable]
  );

  // Ports linkUserToTeamMember (public/legacy-app.js:595-617): now a single targeted field
  // update on the team member's own doc instead of a read-modify-write of the whole stable.
  const linkUserToTeamMember = useCallback(
    async (stableId, teamMemberId, linkedName) => {
      if (!user || !stableId || !teamMemberId) return;
      await updateDoc(doc(db, "stables", stableId, "team", teamMemberId), {
        uid: user.uid,
        userId: user.uid,
        authUid: user.uid,
        email: user.email || "",
        linkedName,
        linkedAt: new Date().toISOString(),
      });
    },
    [user]
  );

  // Ports joinByCode (public/legacy-app.js:496-559): joins the stable, then either
  // auto-links (a direct per-member invite) or hands back pendingJoin so the caller can
  // show the "which team member are you" picker, mirroring _pendingJoin/showJoinTeamModal.
  const joinByCode = useCallback(
    async (rawCode) => {
      if (!user) throw new Error("Inicia sesión primero");
      const code = (rawCode || "").trim().toUpperCase();
      if (!code) throw new Error("Introduce un código de invitación");

      const codeSnap = await getDoc(doc(db, "inviteCodes", code));
      if (!codeSnap.exists()) throw new Error("Código no válido");
      const codeData = codeSnap.data() || {};
      const stableId = codeData.stableId;
      if (!stableId) throw new Error("Código sin cuadra asociada");

      const stableRef = doc(db, "stables", stableId);
      const stableSnap = await getDoc(stableRef);
      if (!stableSnap.exists()) throw new Error("La cuadra ya no existe");
      const stableData = stableSnap.data() || {};
      const memberName = (profile && profile.name) || user.displayName || user.email || "";

      if (!(stableData.memberIds || []).includes(user.uid)) {
        await updateDoc(stableRef, {
          memberIds: arrayUnion(user.uid),
          [`members.${user.uid}`]: {
            name: memberName,
            email: user.email || "",
            role: "miembro",
            teamMemberId: codeData.teamMemberId || null,
            teamName: codeData.teamMemberName || null,
            joined: new Date().toISOString(),
          },
        });
      }

      const teamSnap = await getDocs(collection(db, "stables", stableId, "team"));
      const team = teamSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (codeData.teamMemberId) {
        await linkUserToTeamMember(stableId, codeData.teamMemberId, memberName);
        await switchStable(stableId);
        return { status: "linked", memberName: codeData.teamMemberName || "integrante" };
      }

      const pending = { code, codeData, stableId, stableData, team };
      setPendingJoin(pending);
      return { status: "needs-member-selection", pendingJoin: pending };
    },
    [user, profile, linkUserToTeamMember, switchStable]
  );

  // Ports confirmJoinAs (public/legacy-app.js:619-637).
  const confirmJoinAs = useCallback(
    async (teamMemberId) => {
      if (!pendingJoin) throw new Error("No hay invitación pendiente");
      const memberName =
        (profile && profile.name) || (user && user.displayName) || (user && user.email) || "";
      const selected = teamMemberId
        ? (pendingJoin.team || []).find((m) => m.id === teamMemberId)
        : null;
      if (teamMemberId) {
        await linkUserToTeamMember(pendingJoin.stableId, teamMemberId, memberName);
      }
      const stableId = pendingJoin.stableId;
      setPendingJoin(null);
      await switchStable(stableId);
      return selected ? selected.name : null;
    },
    [pendingJoin, profile, user, linkUserToTeamMember, switchStable]
  );

  const cancelJoin = useCallback(() => setPendingJoin(null), []);

  // Ports createMemberInvite (public/legacy-app.js:737-767), minus the "already linked?"
  // confirm dialog and the clipboard/toast UI, which are the caller's job (same split as
  // deleteStable/leaveStable leaving window.confirm() to StablePanel). Takes the full
  // member object rather than an id, since StableSelectionContext has no access to
  // StableDataContext's `team` slice to look one up itself.
  const createMemberInvite = useCallback(
    async (member) => {
      if (!user || !activeStable) throw new Error("No hay cuadra activa");
      if (!canManageStable(activeStable, user)) {
        throw new Error("Solo el administrador puede crear invitaciones vinculadas");
      }
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      await setDoc(doc(db, "inviteCodes", code), {
        stableId: activeStable.id,
        name: activeStable.name || "",
        teamMemberId: member.id,
        teamMemberName: member.name || "",
        createdBy: user.uid,
        created: new Date().toISOString(),
      });
      return code;
    },
    [user, activeStable]
  );

  // Ports goAfterStableExit (public/legacy-app.js:770-781).
  const exitActiveStable = useCallback(async () => {
    setActiveStableId(null);
    setActiveStable(null);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { lastStable: null }, { merge: true });
      } catch (_e) {
        // ignore
      }
    }
    await refreshStables();
  }, [user, refreshStables]);

  // Ports deleteStable (public/legacy-app.js:783-815). The caller is responsible for
  // confirming with the user before calling this — no window.confirm() here.
  const deleteStable = useCallback(async () => {
    if (!user || !activeStable) return;
    if (!canManageStable(activeStable, user)) {
      throw new Error("No tienes permiso para eliminar esta cuadra");
    }
    await deleteStableCascade(activeStable.id);
    await deleteDoc(doc(db, "stables", activeStable.id));
    if (activeStable.inviteCode) {
      try {
        await deleteDoc(doc(db, "inviteCodes", activeStable.inviteCode));
      } catch (_e) {
        // non-fatal, mirrors legacy behavior
      }
    }
    await exitActiveStable();
  }, [user, activeStable, exitActiveStable]);

  // Ports leaveStable (public/legacy-app.js:817-874). The caller confirms with the user
  // first.
  const leaveStable = useCallback(async () => {
    if (!user || !activeStable) return;
    if (activeStable.ownerId === user.uid) {
      throw new Error("El propietario no puede abandonar: debe eliminar la cuadra");
    }
    const members = activeStable.memberIds || [];
    if (members.length <= 1) {
      throw new Error("Eres el único miembro. Elimina la cuadra.");
    }
    try {
      const teamRef = collection(db, "stables", activeStable.id, "team");
      const snap = await getDocs(
        query(
          teamRef,
          or(
            where("uid", "==", user.uid),
            where("userId", "==", user.uid),
            where("authUid", "==", user.uid)
          )
        )
      );
      await Promise.all(
        snap.docs.map((d) =>
          updateDoc(d.ref, {
            uid: deleteField(),
            userId: deleteField(),
            authUid: deleteField(),
            linkedName: deleteField(),
            linkedAt: deleteField(),
            linkedEmail: deleteField(),
          })
        )
      );
    } catch (_e) {
      // non-fatal, mirrors legacy behavior: don't block leaving the stable
    }
    await updateDoc(doc(db, "stables", activeStable.id), {
      memberIds: arrayRemove(user.uid),
      [`members.${user.uid}`]: deleteField(),
    });
    await exitActiveStable();
  }, [user, activeStable, exitActiveStable]);

  const value = useMemo(
    () => ({
      stables,
      activeStableId,
      activeStable,
      pendingJoin,
      loading,
      error,
      refreshStables,
      switchStable,
      createStable,
      joinByCode,
      confirmJoinAs,
      cancelJoin,
      deleteStable,
      leaveStable,
      exitActiveStable,
      createMemberInvite,
    }),
    [
      stables,
      activeStableId,
      activeStable,
      pendingJoin,
      loading,
      error,
      refreshStables,
      switchStable,
      createStable,
      joinByCode,
      confirmJoinAs,
      cancelJoin,
      deleteStable,
      leaveStable,
      exitActiveStable,
      createMemberInvite,
    ]
  );

  return (
    <StableSelectionContext.Provider value={value}>
      {children}
    </StableSelectionContext.Provider>
  );
}
