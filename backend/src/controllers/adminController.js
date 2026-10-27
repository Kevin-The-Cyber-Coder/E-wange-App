import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Device from "../models/Device.js";
import SensorReading from "../models/SensorReading.js";
import ActivityLog from "../models/ActivityLog.js";
import SystemConfig from "../models/SystemConfig.js";

/**
 * Aggregated numbers for the admin overview dashboard.
 */
export const overview = asyncHandler(async (req, res) => {
  const [users, devices, readings, logs, onlineDevices, configs] = await Promise.all([
    User.countDocuments(),
    Device.countDocuments(),
    SensorReading.countDocuments(),
    ActivityLog.countDocuments(),
    Device.countDocuments({ isOnline: true }),
    SystemConfig.countDocuments(),
  ]);

  const latest = await SensorReading.findOne().sort({ recordedAt: -1 });
  const recentLogs = await ActivityLog.find().sort({ createdAt: -1 }).limit(10);

  res.json({
    success: true,
    message: "Overview",
    data: {
      counts: { users, devices, readings, logs, onlineDevices, configs },
      latestReading: latest || null,
      recentLogs,
    },
  });
});

/**
 * Time-series data for charts. Groups readings per day for the last N days.
 */
export const timeseries = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await SensorReading.aggregate([
    { $match: { recordedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" } },
        avgTemperature: { $avg: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        avgSoilMoisture: { $avg: "$soilMoisture" },
        maxGasValue: { $max: "$gasValue" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, message: "Timeseries", data: rows });
});

export default { overview, timeseries };
