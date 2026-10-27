import dotenv from "dotenv";

dotenv.config();

const required = ["MONGO_URI"];

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/e-wange",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: (process.env.CLIENT_ORIGIN || "http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProd: (process.env.NODE_ENV || "development") === "production",
  // Optional OpenAI-compatible provider used by the dashboard chat assistant.
  aiApiKey: process.env.AI_API_KEY || "",
  aiApiBase: (process.env.AI_API_BASE || "https://api.openai.com/v1").replace(/\/+$/, ""),
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
};

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && env.isProd) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return true;
}

export default env;
