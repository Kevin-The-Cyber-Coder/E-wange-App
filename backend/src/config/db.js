import mongoose from "mongoose";

/**
 * Connect to MongoDB using the connection string from the environment.
 * Exits the process on a failed initial connection so the app never runs
 * in a half-initialised state.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in the environment");
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    console.log("[mongodb] connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongodb] error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongodb] disconnected");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
  console.log("[mongodb] connection closed");
}

export default connectDB;
