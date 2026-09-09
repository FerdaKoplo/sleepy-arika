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
