import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "admin",
  password: "password",
  database: "arika-db",
  max: 5,
});

export const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
