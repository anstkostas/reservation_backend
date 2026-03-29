import app from "./app.js";
import { SERVER } from "./config/env.js";
import { prisma } from "./config/prismaClient.js";

async function startServer(): Promise<void> {
  // JWT_SECRET is validated at module init in config/env.ts — no guard needed here
  try {
    await prisma.$connect();
    console.log("[LOG] server.startServer: Database connected");

    app.listen(SERVER.PORT, () => {
      console.log(`[LOG] server.startServer: Server running on port ${SERVER.PORT}`);
    });
  } catch (err) {
    console.error("[LOG] server.startServer:", err instanceof Error ? err.stack : err);
    process.exit(1);
  }
}

startServer();
