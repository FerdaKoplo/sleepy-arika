import { Profile } from "@prisma/client";

export interface ClusterPocket {
  data: Profile;
  lastAccessed: number;
}

export interface ProfileUpdatePayload {
  username?: string;
  actionsLogged?: number;
}
