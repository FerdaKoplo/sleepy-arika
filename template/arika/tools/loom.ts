import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import {
  sendToWorker,
  sendToPrimary,
  onPrimaryMessage,
  onWorkerMessage,
} from "./bridge";
import { ArikaContext, ArikaWhisper } from "./router";
import { ArikaRing } from "@arika/pockets/ring";
import { flushPendingSyncs } from "@arika/sleeves/worker";
import { memoryBlocks, pendingSyncs } from "@arika/pockets/cluster";
import { emptyingPocket } from "@arika/sleeves/instruction";
import { ArikaSyncDelegate, CacheMutatePayload } from "@arika/pockets/type";

export class Arika {
  private whisperList: ArikaWhisper[] = [];
  private serviceRoutines: (() => Promise<void> | void)[] = [];
  private syncIntervalMs: number = 10000;
  private syncDelegate?: ArikaSyncDelegate;

  public onSync(delegate: ArikaSyncDelegate): this {
    this.syncDelegate = delegate;
    return this;
  }

  public whispers(routes: ArikaWhisper[]): this {
    this.whisperList = routes;
    return this;
  }

  public dream(services: (() => Promise<void> | void)[]): this {
    this.serviceRoutines = services;
    return this;
  }

  public wake(port: number): void {
    const numCores = os.cpus().length;
    const workerIds = Array.from({ length: numCores }, (_, i) =>
      (i + 1).toString(),
    );
    const ring = new ArikaRing(workerIds);

    if (cluster.isPrimary) {
      console.log(` Arika is waking. Spawning ${numCores} departments...`);

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

      setInterval(() => {
        flushPendingSyncs(this.syncDelegate).catch(console.error);
      }, this.syncIntervalMs);

      onWorkerMessage((payload) => {
        memoryBlocks.set(payload.key, {
          data: payload.data,
          lastAccessed: Date.now(),
        });
        pendingSyncs.add(payload.key);
      });

      process.on("SIGINT", () => emptyingPocket("SIGINT"));
      process.on("SIGTERM", () => emptyingPocket("SIGTERM"));

      Promise.all(this.serviceRoutines.map((service) => service())).then(() => {
        this.whisperList.forEach((whisper) => {
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

        app.listen({ port, host: "0.0.0.0" }).then(() => {
          console.log(`[ ${myDepartmentId}] Dreaming on port ${port}`);
        });
      });
    }
  }
}
