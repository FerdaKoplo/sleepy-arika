import { PrismaClient } from "@prisma/client";
import { memoryBlocks, pendingSyncs } from "../pockets/cluster";
import { prisma } from "../compartments/adapter";

export async function flushPendingSyncs(): Promise<void> {
  // if you're not doing anything then let arika rest >:(
  if (pendingSyncs.size === 0) return;

  // grab the current batch of user IDs that need syncing,
  // and instantly clear the set so Aika can keep accepting new requests without blocking
  const usersToSync: string[] = Array.from(pendingSyncs);
  pendingSyncs.clear();

  try {
    // translate arika short-term memory into database instruction
    const syncOperations = usersToSync
      .map((userId) => {
        // retrive the latest state of the user from arika pockets, its not thieving!
        const pocket = memoryBlocks.get(userId);

        if (!pocket) return null;

        // build the prisma instruction because it would come in handy surely
        // upsert ensures we either update the existing row or create a brand new one
        return prisma.profile.upsert({
          where: { id: userId },
          update: {
            username: pocket.data.username,
            actionsLogged: pocket.data.actionsLogged,
          },
          create: {
            id: userId,
            username: pocket.data.username,
            actionsLogged: pocket.data.actionsLogged,
          },
        });
      })
      .filter((op): op is NonNullable<typeof op> => op !== null);

    await prisma.$transaction(syncOperations);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Sync failed! Aika Has Tried :(`, error.message);
    }
    usersToSync.forEach((id) => pendingSyncs.add(id));
    throw error;
  }
}
