import mongoose from "mongoose";

const sensorReadingSchema = new mongoose.Schema(
  {
    temperature: {
      type: Number,
      default: 0,
    },
    humidity: {
      type: Number,
      default: 0,
    },
    gas: {
      type: String,
      default: "—",
    },
    gasValue: {
      type: Number,
      default: 0,
    },
    soilMoisture: {
      type: Number,
      default: 0,
    },
    parking: {
      slot1: { type: String, default: "—" },
      slot2: { type: String, default: "—" },
      gate: { type: String, default: "—" },
    },
    source: {
      type: String,
      default: "device",
      trim: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

sensorReadingSchema.index({ recordedAt: -1 });

export const SensorReading = mongoose.model("SensorReading", sensorReadingSchema);

export default SensorReading;
