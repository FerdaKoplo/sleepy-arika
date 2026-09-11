import { memoryBlocks, pendingSyncs } from "@arika/pockets/cluster";
import { ArikaSyncDelegate } from "@arika/pockets/type";
import { prisma } from "compartments/adapter";

export async function flushPendingSyncs(
  delegate?: ArikaSyncDelegate,
): Promise<void> {
  // if you're not doing anything then let arika rest >:(
  if (pendingSyncs.size === 0 || !delegate) return;

  // grab the current batch of user IDs that need syncing,
  // and instantly clear the set so Aika can keep accepting new requests without blocking
  const usersToSync: string[] = Array.from(pendingSyncs);
  pendingSyncs.clear();

  try {
    await delegate(usersToSync, memoryBlocks);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Sync failed! Aika Has Tried :(`, error.message);
    }
    usersToSync.forEach((id) => pendingSyncs.add(id));
    throw error;
  }
}
