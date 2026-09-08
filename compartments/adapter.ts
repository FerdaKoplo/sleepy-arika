import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3306,
  user: "admin",
  password: "password",
  database: "arika-db",
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
