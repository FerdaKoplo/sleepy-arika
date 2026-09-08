import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ||
      "mysql://admin:password@localhost:3306/arika-db",
  },
});
