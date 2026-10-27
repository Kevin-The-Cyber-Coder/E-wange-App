import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "E-Wange API is running",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "Healthy" : "Database unavailable",
    data: {
      database: dbState,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
