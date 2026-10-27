import { z } from "zod";
import SensorReading from "../models/SensorReading.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createReadingSchema = z.object({
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  gas: z.string().optional(),
  gasValue: z.number().optional(),
  soilMoisture: z.number().optional(),
  parking: z
    .object({
      slot1: z.string().optional(),
      slot2: z.string().optional(),
      gate: z.string().optional(),
    })
    .optional(),
  source: z.string().optional(),
  recordedAt: z.coerce.date().optional(),
});

export const createReading = asyncHandler(async (req, res) => {
  const reading = await SensorReading.create(req.body);
  res.status(201).json({ success: true, message: "Reading stored", data: reading });
});

export const listReadings = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const readings = await SensorReading.find()
    .sort({ recordedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await SensorReading.countDocuments();

  res.json({
    success: true,
    message: "Sensor readings",
    data: readings,
    meta: { page, limit, total },
  });
});

export const latestReading = asyncHandler(async (req, res) => {
  const reading = await SensorReading.findOne().sort({ recordedAt: -1 });

  res.json({
    success: true,
    message: reading ? "Latest reading" : "No readings yet",
    data: reading || null,
  });
});

export default { createReading, listReadings, latestReading };
