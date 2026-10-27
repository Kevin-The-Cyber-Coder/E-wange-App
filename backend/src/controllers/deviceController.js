import { z } from "zod";
import Device from "../models/Device.js";
import ActivityLog from "../models/ActivityLog.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(1).max(80),
  type: z
    .enum(["light", "fan", "curtain", "buzzer", "pump", "door", "gate", "sensor", "other"])
    .optional(),
  room: z.string().max(80).optional(),
  status: z.enum(["on", "off", "open", "closed", "unknown"]).optional(),
  meta: z.record(z.any()).optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const listDevices = asyncHandler(async (req, res) => {
  const { type, status, search } = req.query;
  const filter = {};

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: "i" };

  const devices = await Device.find(filter).sort({ name: 1 });

  res.json({ success: true, message: "Devices", data: devices });
});

export const getDevice = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);

  if (!device) {
    throw ApiError.notFound("Device not found");
  }

  res.json({ success: true, message: "Device", data: device });
});

export const createDevice = asyncHandler(async (req, res) => {
  const device = await Device.create(req.body);

  await ActivityLog.create({
    type: "system",
    message: `Device "${device.name}" created`,
    user: req.user?.id || null,
    device: device._id,
  });

  res.status(201).json({ success: true, message: "Device created", data: device });
});

export const updateDevice = asyncHandler(async (req, res) => {
  const device = await Device.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!device) {
    throw ApiError.notFound("Device not found");
  }

  res.json({ success: true, message: "Device updated", data: device });
});

export const deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findByIdAndDelete(req.params.id);

  if (!device) {
    throw ApiError.notFound("Device not found");
  }

  res.json({ success: true, message: "Device deleted", data: null });
});

export const toggleDevice = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);

  if (!device) {
    throw ApiError.notFound("Device not found");
  }

  const onStates = ["on", "open"];
  device.status = onStates.includes(device.status) ? "off" : "on";
  device.turns += 1;
  await device.save();

  await ActivityLog.create({
    type: "device_toggle",
    message: `${device.name} turned ${device.status}`,
    user: req.user?.id || null,
    device: device._id,
  });

  res.json({ success: true, message: "Device toggled", data: device });
});

export default {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
};
