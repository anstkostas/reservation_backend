import app from "@/app.js";
import { SERVER } from "@/config/env.js";
import { prisma } from "@/config/prismaClient.js";
import { refreshTokenRepository } from "@/repositories/index.js";

// Render kills the deploy if the port isn't bound quickly — but our Docker Command
// runs `prisma migrate reset && prisma db seed` concurrently with this process, so
// the DB is briefly unavailable (or mid-reset) right after boot. Retry instead of
// failing fast so the port can bind immediately while the DB catches up.
const DB_CONNECT_RETRY_DELAY_MS = 2000;

/**
 * Repeatedly attempts to connect to the database until it succeeds.
 * Retries indefinitely on failure — intended to run alongside an already-listening
 * server so a slow or resetting DB never blocks port binding.
 *
 * @returns {Promise<void>} Resolves once a real connection is confirmed via SELECT 1
 */
async function connectWithRetry(): Promise<void> {
  for (;;) {
    try {
      await prisma.$connect();
      // $connect() is lazy in Prisma 7 — force a real connection attempt before logging success
      await prisma.$queryRaw`SELECT 1`;
      console.log("[LOG] server.connectWithRetry: Database connected");
      return;
    } catch (err) {
      console.error(
        `[LOG] server.connectWithRetry: Database not ready, retrying in ${DB_CONNECT_RETRY_DELAY_MS}ms —`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((resolve) => setTimeout(resolve, DB_CONNECT_RETRY_DELAY_MS));
    }
  }
}

async function startServer(): Promise<void> {
  // JWT_SECRET is validated at module init in config/env.ts — no guard needed here

  // Bind the port first so Render's readiness check passes immediately, independent
  // of how long the concurrent DB reset/seed takes.
  app.listen(SERVER.PORT, () => {
    console.log(`[LOG] server.startServer: Server running on port ${SERVER.PORT}`);
  });

  await connectWithRetry();

  // Prune expired refresh tokens on startup — prevents unbounded table growth
  const pruned = await refreshTokenRepository.pruneExpired();
  if (pruned > 0) {
    console.log(`[LOG] server.startServer: Pruned ${pruned} expired refresh token(s)`);
  }
}

startServer();
