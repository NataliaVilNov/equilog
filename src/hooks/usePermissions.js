import { useCallback, useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../contexts/StableSelectionContext.jsx";
import { useStableData } from "./useStableData.js";
import {
  canManageStable,
  defaultTeamPermissions,
  fullPermissions,
} from "../lib/permissions.js";

// Ports isStableAdmin/myTeamMember/myPermissions/canPerm
// (public/legacy-app.js:650-674).
export function usePermissions() {
  const { user } = useContext(AuthContext) || {};
  const { activeStable } = useContext(StableSelectionContext) || {};
  const { team } = useStableData();

  const isAdmin = useMemo(
    () => canManageStable(activeStable, user),
    [activeStable, user]
  );

  const myTeamMember = useMemo(() => {
    if (!user) return null;
    return (
      (team || []).find(
        (m) => m.uid === user.uid || m.userId === user.uid || m.authUid === user.uid
      ) || null
    );
  }, [team, user]);

  const permissions = useMemo(() => {
    if (isAdmin) return fullPermissions();
    return {
      ...defaultTeamPermissions(),
      ...(myTeamMember && myTeamMember.permissions ? myTeamMember.permissions : {}),
    };
  }, [isAdmin, myTeamMember]);

  const can = useCallback((key) => !!permissions[key], [permissions]);

  return { isAdmin, myTeamMember, permissions, can, uid: user ? user.uid : null };
}
