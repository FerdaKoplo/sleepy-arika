import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mongodb://admin:password@127.0.0.1:27017/arika-db?authSource=admin",
    },
  },
});
