import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { memoryBlocks, pendingSyncs } from "./pockets/cluster";
import { ProfileRequest, ProfileUpdatePayload } from "./pockets/type";
import { prisma } from "./compartments/adapter";
import { flushPendingSyncs } from "./sleeves/worker";
import { emptyingPocket } from "./sleeves/instruction";

const app = Fastify({ logger: false });
const PORT = parseInt(process.env.PORT || "3005", 10);

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
  (request: ProfileRequest, reply: FastifyReply) => {
    const userId = request.params.id;
    const { username, actionsLogged } = request.body;

    // Retrived the existing pockets / data
    const currentPocket = memoryBlocks.get(userId);

    // Merge Existing memory with incoming payload
    const updatedProfile = {
      id: userId,
      username: username ?? (currentPocket?.data.username || "Unknown"),
      actionsLogged:
        (currentPocket?.data.actionsLogged || 0) + (actionsLogged || 0),
      lastActive: new Date(),
    };

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
