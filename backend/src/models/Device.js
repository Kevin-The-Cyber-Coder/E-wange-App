import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Device name is required"],
      trim: true,
      maxlength: 120,
    },
    // e.g. lamp, fan, curtains, buzzer, water_pump, main_door
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["light", "fan", "curtain", "buzzer", "pump", "door", "gate", "sensor", "other"],
      default: "other",
    },
    room: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["on", "off", "open", "closed", "unknown"],
      default: "unknown",
    },
    turns: {
      type: Number,
      default: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

export const Device = mongoose.model("Device", deviceSchema);

export default Device;
