import express, { Request, Response } from "express";
import cors from "cors";
import { memoryBlocks, pendingSyncs } from "./pockets/cluster";
import { ProfileUpdatePayload } from "./pockets/type";
import { prisma } from "./compartments/adapter";
import { flushPendingSyncs } from "./sleeves/worker";
import { emptyingPocket } from "./sleeves/instruction";

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// calling the trick under the sleeves :00

setInterval(() => {
  flushPendingSyncs().catch(console.error);
}, 10000);

app.listen(PORT, () => {
  console.log(`Arika still tired but her dream is somewhere beyond : ${PORT}`);
  console.log(`My trick is syncing every 10s!`);
});

app.post(
  "/api/unclustered/profile/:id",
  async (
    req: Request<{ id: string }, {}, ProfileUpdatePayload>,
    res: Response,
  ): Promise<void> => {
    const userId = req.params.id;
    const { username, actionsLogged } = req.body;

    // conventional prisma call

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

      res.json({ message: "Database update complete", data: dbProfile });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Database error";
      res.status(500).json({ error: errorMessage });
    }
  },
);

app.post(
  "/api/clustered/profile/:id",
  (
    req: Request<{ id: string }, {}, ProfileUpdatePayload>,
    res: Response,
  ): void => {
    const userId = req.params.id;
    const { username, actionsLogged } = req.body;

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
    res.json({
      message: "Memory cluster updated instantly",
      data: updatedProfile,
    });
  },
);

process.on("SIGINT", () => emptyingPocket("SIGINT"));
process.on("SIGTERM", () => emptyingPocket("SIGTERM"));
