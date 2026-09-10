import { Profile } from "@prisma/client";
import { FastifyRequest } from "fastify";

export interface ClusterPocket {
  data: Profile;
  lastAccessed: number;
}

export interface ProfileUpdatePayload {
  username?: string;
  actionsLogged?: number;
}

export type ProfileRequest = FastifyRequest<{
  Params: { id: string };
  Body: ProfileUpdatePayload;
}>;

export interface CacheMutatePayload {
  userId: string;
  updatedProfile: {
    id: string;
    username: string;
    actionsLogged: number;
    lastActive: Date;
  };
}

export interface ForwardCacheMutateMessage {
  type: "FORWARD_CACHE_MUTATE";
  targetId: string;
  payload: CacheMutatePayload;
}

type ArikaIpcMessage = ForwardCacheMutateMessage;
