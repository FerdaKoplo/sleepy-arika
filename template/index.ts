import cluster from "node:cluster";
import os from "node:os";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { memoryBlocks, pendingSyncs } from "./pockets/cluster";
import {
  ForwardCacheMutateMessage,
  ProfileRequest,
  ProfileUpdatePayload,
} from "./pockets/type";
import { prisma } from "./compartments/adapter";
import { flushPendingSyncs } from "./sleeves/worker";
import { emptyingPocket } from "./sleeves/instruction";
import { clusteredRouteOpts } from "./sleeves/schema";
import { ArikaRing } from "./pockets/ring";

const numCores = os.cpus().length;
const workerIds = Array.from({ length: numCores }, (_, i) =>
  (i + 1).toString(),
);
const ring = new ArikaRing(workerIds);

if (cluster.isPrimary) {
  console.log(`Booting up manager. Spawning ${numCores} worker departments...`);

  for (let i = 0; i < numCores; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker: cluster.Worker, message: unknown) => {
    const msg = message as ForwardCacheMutateMessage;

    if (msg && msg.type === "FORWARD_CACHE_MUTATE") {
      const targetWorker = cluster.workers?.[msg.targetId];
      if (targetWorker) {
        targetWorker.send(msg.payload);
      }
    }
  });

  cluster.on("exit", (worker: cluster.Worker) => {
    console.log(`Worker ${worker.process.pid} died. Forking a replacement...`);
    cluster.fork();
  });
} else {
  const app = Fastify({ logger: false, keepAliveTimeout: 60000 });
  const PORT = parseInt(process.env.PORT || "3005", 10);
  const myDepartmentId = cluster.worker!.id.toString();
  // calling the trick under the sleeves :00
  setInterval(() => {
    flushPendingSyncs().catch(console.error);
  }, 10000);

  app.post(
    "/api/unclustered/profile/:id",
    async (request: ProfileRequest, reply: FastifyReply) => {
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
  );

  app.post(
    "/api/clustered/profile/:id",
    clusteredRouteOpts,
    (request: ProfileRequest) => {
      const userId = request.params.id;
      const { username, actionsLogged } = request.body;

      // Retrived the existing pockets / data
      const targetDepartment = ring.getNodeKey(userId);
      const currentPocket = memoryBlocks.get(userId);

      // Merge Existing memory with incoming payload
      const updatedProfile = {
        id: userId,
        username: username ?? (currentPocket?.data.username || "Unknown"),
        actionsLogged:
          (currentPocket?.data.actionsLogged || 0) + (actionsLogged || 0),
        lastActive: new Date(),
      };

      if (targetDepartment === myDepartmentId) {
        memoryBlocks.set(userId, {
          data: updatedProfile,
          lastAccessed: Date.now(),
        });
        pendingSyncs.add(userId);
      }

      // Shove the updated state instantly back to pockets / data
      memoryBlocks.set(userId, {
        data: updatedProfile,
        lastAccessed: Date.now(),
      });

      pendingSyncs.add(userId);

      // Return instantly
      return {
        message: "Memory cluster updated instantly",
        data: updatedProfile,
      };
    },
  );

  process.on("SIGINT", () => emptyingPocket("SIGINT"));
  process.on("SIGTERM", () => emptyingPocket("SIGTERM"));

  const start = async () => {
    try {
      await app.listen({ port: PORT, host: "0.0.0.0" });
      console.log(`Arika is awake but her dream is somewhere beyond : ${PORT}`);
      console.log(`My trick is syncing every 10s!`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  start();
}
