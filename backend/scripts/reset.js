import "../src/config/env.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";

/**
 * Wipes the configured database. Use only on a scratch database.
 */
export async function resetDatabase() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await disconnectDB();
}

if (process.argv[1] && process.argv[1].endsWith("reset.js")) {
  resetDatabase()
    .then(() => {
      console.log("[db] database dropped");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[db] reset failed:", err);
      process.exit(1);
    });
}
