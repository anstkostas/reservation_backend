import app from "./app.js";
import { SERVER } from "./config/env.js";
import { prisma } from "./config/prismaClient.js";
import { refreshTokenRepository } from "./repositories/index.js";

async function startServer(): Promise<void> {
  // JWT_SECRET is validated at module init in config/env.ts — no guard needed here
  try {
    await prisma.$connect();
    // $connect() is lazy in Prisma 7 — force a real connection attempt before logging success
    await prisma.$queryRaw`SELECT 1`;
    console.log("[LOG] server.startServer: Database connected");

    // Prune expired refresh tokens on startup — prevents unbounded table growth
    const pruned = await refreshTokenRepository.pruneExpired();
    if (pruned > 0) {
      console.log(`[LOG] server.startServer: Pruned ${pruned} expired refresh token(s)`);
    }

    app.listen(SERVER.PORT, () => {
      console.log(`[LOG] server.startServer: Server running on port ${SERVER.PORT}`);
    });
  } catch (err) {
    if (err instanceof Error && err.constructor.name.startsWith("PrismaClient")) {
      console.error("[LOG] server.startServer: Cannot connect to the database — if it is served via Docker check that a Docker instance is running either from terminal with 'npm run docker:up' or the UI app.");
    }
    console.error("[LOG] server.startServer:", err instanceof Error ? err.stack : err);
    process.exit(1);
  }
}

startServer();
