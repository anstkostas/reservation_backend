import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Match the app's env loading strategy — load from .env.<NODE_ENV>
dotenv.config({ path: `.env.${process.env["NODE_ENV"] ?? "development"}` });

// Support DB_URL (full connection string) or individual credentials (local dev)
// Use DB_URL if set and non-empty; otherwise construct from individual credentials
const databaseUrl =
  process.env["DB_URL"] ||
  `postgresql://${process.env["DB_USER"] || "postgres"}:${process.env["DB_PASSWORD"]}@${process.env["DB_HOST"] || "localhost"}:${process.env["DB_PORT"] || "5432"}/${process.env["DB_NAME"] || "cf8-reservation"}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
