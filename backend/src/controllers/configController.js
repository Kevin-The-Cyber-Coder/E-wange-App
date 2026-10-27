import { z } from "zod";
import SystemConfig from "../models/SystemConfig.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const updateConfigSchema = z.object({
  value: z.unknown(),
});

/**
 * Returns every config row as `{ key, value }`, which is the shape the
 * admin configuration screen consumes.
 */
export const listConfig = asyncHandler(async (req, res) => {
  const items = await SystemConfig.find().sort({ createdAt: 1 });

  res.json({
    success: true,
    message: "System configuration",
    data: items.map((item) => ({ key: item.key, value: item.value })),
    meta: { total: items.length },
  });
});

export const upsertConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;

  const item = await SystemConfig.findOneAndUpdate(
    { key },
    { $set: { value: req.body.value } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  res.json({ success: true, message: "Configuration saved", data: item });
});

export default { listConfig, upsertConfig };
