import { ArikaSyncDelegate } from "@arika/pockets/type";
import { prisma } from "compartments/adapter";
import { ProfileData } from "compartments/interfaces";
import { profileAccessor } from "wakes/profile.wake";

export const ProfileSyncDream: ArikaSyncDelegate = async (
  keysToSync,
  memory,
) => {
  const batch = profileAccessor.extractBatch(keysToSync, memory);

  const syncOperations = batch.map(({ key, data }) => {
    return prisma.profile.upsert({
      where: { id: key },
      update: {
        username: data.username,
        actionsLogged: data.actionsLogged,
      },
      create: {
        id: key,
        username: data.username,
        actionsLogged: data.actionsLogged,
      },
    });
  });

  if (syncOperations.length > 0) {
    await prisma.$transaction(syncOperations);
  }
};
