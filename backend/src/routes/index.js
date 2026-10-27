import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import deviceRoutes from "./deviceRoutes.js";
import sensorRoutes from "./sensorRoutes.js";
import logRoutes from "./logRoutes.js";
import userRoutes from "./userRoutes.js";
import configRoutes from "./configRoutes.js";
import aiRoutes from "./aiRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/devices", deviceRoutes);
router.use("/sensors", sensorRoutes);
router.use("/logs", logRoutes);
router.use("/users", userRoutes);
router.use("/config", configRoutes);
router.use("/ai", aiRoutes);
router.use("/admin", adminRoutes);

export default router;
