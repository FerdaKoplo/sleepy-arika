import { ArikaContext } from "@arika/tools/router";
import { memoryBlocks, pendingSyncs } from "./cluster";
import { ClusterPocket } from "./type";

export class PocketAccessor<T> {
  public mutate(
    key: string,
    context: ArikaContext,
    updater: (current: T | undefined) => T,
  ): T {
    const targetDepartment = context.ring.getNodeKey(key);
    const currentPocket = memoryBlocks.get(key) as ClusterPocket<T> | undefined;

    const updatedData = updater(currentPocket?.data);

    if (targetDepartment === context.departmentId) {
      memoryBlocks.set(key, { data: updatedData, lastAccessed: Date.now() });
      pendingSyncs.add(key);
    } else {
      context.forwardCacheMutate(targetDepartment, { key, data: updatedData });
    }

    return updatedData;
  }

  public extractBatch(
    keys: string[],
    rawMemory: Map<string, ClusterPocket<unknown>>,
  ): { key: string; data: T }[] {
    return keys
      .map((key) => {
        const pocket = rawMemory.get(key);
        if (!pocket) return null;

        return { key, data: pocket.data as T };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
