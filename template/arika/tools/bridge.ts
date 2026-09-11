import process from "node:process";
import cluster from "node:cluster";
import {
  CacheMutatePayload,
  ForwardCacheMutateMessage,
} from "@arika/pockets/type";

export function sendToPrimary(message: ForwardCacheMutateMessage): void {
  if (process.send) {
    process.send(message);
  }
}

export function sendToWorker(
  worker: cluster.Worker,
  payload: CacheMutatePayload,
): void {
  worker.send(payload);
}

export function onWorkerMessage(
  handler: (payload: CacheMutatePayload) => void,
): void {
  process.on("message", (message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "key" in message &&
      "data" in message
    ) {
      handler(message as CacheMutatePayload);
    }
  });
}

export function onPrimaryMessage(
  handler: (msg: ForwardCacheMutateMessage) => void,
): void {
  cluster.on("message", (_worker: cluster.Worker, message: unknown) => {
    if (typeof message === "object" && message !== null && "type" in message) {
      handler(message as ForwardCacheMutateMessage);
    }
  });
}
