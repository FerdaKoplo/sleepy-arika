import { ArikaRing } from "@arika/pockets/ring";
import { CacheMutatePayload } from "@arika/pockets/type";
import {
  FastifyReply,
  FastifyRequest,
  RouteShorthandOptions,
  RouteGenericInterface,
} from "fastify";

export interface ArikaContext {
  ring: ArikaRing;
  departmentId: string;
  forwardCacheMutate: (targetId: string, payload: CacheMutatePayload) => void;
}

export interface ArikaWhisper<
  T extends RouteGenericInterface = RouteGenericInterface,
> {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  options?: RouteShorthandOptions;
  handler(
    request: FastifyRequest<T>,
    reply: FastifyReply,
    context: ArikaContext,
  ): Promise<unknown> | unknown;
}

export function defineWhisper<
  T extends RouteGenericInterface = RouteGenericInterface,
>(whisper: ArikaWhisper<T>) {
  return whisper;
}
