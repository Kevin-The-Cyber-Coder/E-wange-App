import { z } from "zod";
import ActivityLog from "../models/ActivityLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createLogSchema = z.object({
  type: z.enum(["door_access", "device_toggle", "alarm", "system", "auth"]).optional(),
  message: z.string().min(1),
  user: z.string().optional(),
  userName: z.string().optional(),
  device: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

export const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const filter = {};

  if (req.query.type) filter.type = req.query.type;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const logs = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user", "name email")
    .populate("device", "name key");

  const total = await ActivityLog.countDocuments(filter);

  res.json({
    success: true,
    message: "Activity logs",
    data: logs,
    meta: { page, limit, total },
  });
});

export const createLog = asyncHandler(async (req, res) => {
  const log = await ActivityLog.create(req.body);
  res.status(201).json({ success: true, message: "Log created", data: log });
});

export default { listLogs, createLog };
