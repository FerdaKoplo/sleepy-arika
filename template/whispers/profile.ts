import { memoryBlocks, pendingSyncs } from "../pockets/cluster";
import { ProfileRequest } from "../pockets/type";
import { clusteredRouteOpts } from "../sleeves/schema";
import { prisma } from "../compartments/adapter";
import { defineWhisper } from "../arika/router";
import { FastifyReply } from "fastify";

export const clusteredProfileRoute = defineWhisper({
  method: "POST",
  url: "/api/clustered/profile/:id",
  options: clusteredRouteOpts,
  handler: (request: ProfileRequest, reply, context) => {
    const userId = request.params.id;
    const { username, actionsLogged } = request.body;

    const targetDepartment = context.ring.getNodeKey(userId);
    const currentPocket = memoryBlocks.get(userId);

    const updatedProfile = {
      id: userId,
      username: username ?? (currentPocket?.data.username || "Unknown"),
      actionsLogged:
        (currentPocket?.data.actionsLogged || 0) + (actionsLogged || 0),
      lastActive: new Date(),
    };

    if (targetDepartment === context.departmentId) {
      memoryBlocks.set(userId, {
        data: updatedProfile,
        lastAccessed: Date.now(),
      });
      pendingSyncs.add(userId);
    } else {
      context.forwardCacheMutate(targetDepartment, { userId, updatedProfile });
    }

    return {
      message: "Memory cluster updated instantly",
      data: updatedProfile,
    };
  },
});

export const unclusteredProfileRoute = defineWhisper({
  method: "POST",
  url: "/api/unclustered/profile/:id",
  handler: async (request: ProfileRequest, reply: FastifyReply) => {
    const userId = request.params.id;
    const { username, actionsLogged } = request.body;

    try {
      const dbProfile = await prisma.profile.upsert({
        where: { id: userId },
        update: {
          ...(username && { username }),
          ...(actionsLogged !== undefined && {
            actionsLogged: { increment: actionsLogged },
          }),
        },
        create: {
          id: userId,
          username: username || "Unknown",
          actionsLogged: actionsLogged || 0,
        },
      });

      return { message: "Database update complete", data: dbProfile };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Database error";
      return reply.status(500).send({ error: errorMessage });
    }
  },
});
