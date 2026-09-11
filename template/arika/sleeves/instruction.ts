import { prisma } from "compartments/adapter";
import { flushPendingSyncs } from "./worker";

export async function emptyingPocket(item: string) {
  console.log(
    `\n[${item}] Item found! Arika still sleepy but she would emptied her pockets right away`,
  );
  try {
    await flushPendingSyncs();
    console.log(`All pending memory safely written to the physical notebook`);

    await prisma.$disconnect();
    console.log(`Database connection closed. Goodnight!`);

    process.exit(0);
  } catch (error) {
    console.error(`Panic during shutdown! Memory might be lost:`, error);
    process.exit(1);
  }
}
