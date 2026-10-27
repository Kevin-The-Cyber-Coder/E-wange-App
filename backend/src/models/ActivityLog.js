import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // door_access, device_toggle, alarm, system, auth
    type: {
      type: String,
      enum: ["door_access", "device_toggle", "alarm", "system", "auth"],
      default: "system",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
