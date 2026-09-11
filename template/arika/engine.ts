import { ArikaContext, ArikaWhisper } from "./router";
import cluster from "node:cluster";
import os from "node:os";
import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { ArikaRing } from "../pockets/ring";
import { memoryBlocks, pendingSyncs } from "../pockets/cluster";
import process from "node:process";
import { flushPendingSyncs } from "../sleeves/worker";
import { emptyingPocket } from "../sleeves/instruction";
import { CacheMutatePayload, ForwardCacheMutateMessage } from "../pockets/type";
import {
  onPrimaryMessage,
  onWorkerMessage,
  sendToPrimary,
  sendToWorker,
} from "./bridge";

interface ArikaConfig {
  port: number;
  syncIntervalMs: number;
  whispers: ArikaWhisper[];
}

export function igniteArika(config: ArikaConfig) {
  const numCores = os.cpus().length;
  const workerIds = Array.from({ length: numCores }, (_, i) =>
    (i + 1).toString(),
  );
  const ring = new ArikaRing(workerIds);

  if (cluster.isPrimary) {
    console.log(`Arika is called. Spawning ${numCores} worker departments...`);

    for (let i = 0; i < numCores; i++) {
      cluster.fork();
    }

    onPrimaryMessage((msg) => {
      if (msg.type === "FORWARD_CACHE_MUTATE") {
        const targetWorker = cluster.workers?.[msg.targetId];
        if (targetWorker) {
          sendToWorker(targetWorker, msg.payload);
        }
      }
    });

    cluster.on("exit", (worker: cluster.Worker) => {
      const pid = worker.process.pid || "Unknown";
      console.log(`Worker ${pid} died. Forking a replacement...`);
      cluster.fork();
    });
  } else {
    const app = Fastify({ logger: false, keepAliveTimeout: 60000 });

    const myDepartmentId = cluster.worker?.id.toString() || "0";

    app.decorate("ring", ring);
    app.decorate("departmentId", myDepartmentId);

    setInterval(() => {
      flushPendingSyncs().catch(console.error);
    }, config.syncIntervalMs);

    onWorkerMessage((payload) => {
      memoryBlocks.set(payload.userId, {
        data: payload.updatedProfile,
        lastAccessed: Date.now(),
      });
      pendingSyncs.add(payload.userId);
    });

    config.whispers.forEach((whisper: ArikaWhisper) => {
      app.route({
        method: whisper.method,
        url: whisper.url,
        ...whisper.options,
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
          const context: ArikaContext = {
            ring,
            departmentId: myDepartmentId,
            forwardCacheMutate: (
              targetId: string,
              payload: CacheMutatePayload,
            ) => {
              sendToPrimary({
                type: "FORWARD_CACHE_MUTATE",
                targetId,
                payload,
              });
            },
          };

          return whisper.handler(request, reply, context);
        },
      });
    });

    process.on("SIGINT", () => emptyingPocket("SIGINT"));
    process.on("SIGTERM", () => emptyingPocket("SIGTERM"));

    app
      .listen({ port: config.port, host: "0.0.0.0" })
      .then(() => {
        console.log(`${myDepartmentId}] Awake at port ${config.port}`);
      })
      .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
      });
  }
}
