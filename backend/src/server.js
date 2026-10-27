import app from "./app.js";
import env, { validateEnv } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

async function bootstrap() {
  validateEnv();

  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
