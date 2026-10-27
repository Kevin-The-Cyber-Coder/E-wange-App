import mongoose from "mongoose";

/**
 * Key/value store for the admin "System Configuration" screen.
 *
 * `value` holds the whole descriptor used by the UI:
 *   { current, label, description, type, group, group_icon, group_color, order, ... }
 */
const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Config key is required"],
      unique: true,
      trim: true,
      maxlength: 120,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Config value is required"],
    },
  },
  { timestamps: true },
);

export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

export default SystemConfig;
