export interface ClusterPocket<T = unknown> {
  data: T;
  lastAccessed: number;
}
export type ArikaSyncDelegate = (
  keysToSync: string[],
  memory: Map<string, ClusterPocket<unknown>>,
) => Promise<void>;

export interface CacheMutatePayload<T = unknown> {
  key: string;
  data: T;
}

export interface ForwardCacheMutateMessage {
  type: "FORWARD_CACHE_MUTATE";
  targetId: string;
  payload: CacheMutatePayload;
}

type ArikaIpcMessage = ForwardCacheMutateMessage;
