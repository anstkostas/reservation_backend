import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { DB_CONFIG } from "./env.js";

// Cache the client on globalThis to prevent multiple instances during hot-reload in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Prisma v7 requires a driver adapter — no zero-arg constructor exists
// PrismaPg accepts a PoolConfig object directly; DB_CONFIG is a discriminated union:
// URL (production full connection string) or individual credentials (local dev)
const poolConfig =
  "URL" in DB_CONFIG
    ? { connectionString: DB_CONFIG.URL }
    : {
        host: DB_CONFIG.HOST,
        port: DB_CONFIG.PORT,
        database: DB_CONFIG.NAME,
        user: DB_CONFIG.USER,
        password: DB_CONFIG.PASSWORD,
      };

const adapter = new PrismaPg(poolConfig);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
