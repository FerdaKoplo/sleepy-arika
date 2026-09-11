import { PocketAccessor } from "@arika/pockets/accessor";
import { memoryBlocks, pendingSyncs } from "@arika/pockets/cluster";
import { ClusterPocket } from "@arika/pockets/type";
import { ArikaContext } from "@arika/tools/router";
import { ProfileData } from "compartments/interfaces";

export const profileAccessor = new PocketAccessor<ProfileData>();

export const ProfileWake = {
  syncClusteredProfile: (
    userId: string,
    username: string | undefined,
    actionsLogged: number | undefined,
    context: ArikaContext,
  ) => {
    return profileAccessor.mutate(userId, context, (current) => ({
      id: userId,
      username: username ?? (current?.username || "Unknown"),
      actionsLogged: (current?.actionsLogged || 0) + (actionsLogged || 0),
      lastActive: new Date(),
    }));
  },
};
