import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/index.js';
import { DB_CONFIG } from '../../config/env.js';

// Intentionally NOT the globalThis singleton from prismaClient.ts —
// tests must use this client so they always talk to the test DB, not dev.
const poolConfig =
  'URL' in DB_CONFIG
    ? { connectionString: DB_CONFIG.URL }
    : {
        host: DB_CONFIG.HOST,
        port: DB_CONFIG.PORT,
        database: DB_CONFIG.NAME,
        user: DB_CONFIG.USER,
        password: DB_CONFIG.PASSWORD,
      };

const adapter = new PrismaPg(poolConfig);
export const testPrisma = new PrismaClient({ adapter });
