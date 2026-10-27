/**
 * Seeds the primary admin account.
 *
 * Usage:
 *   npm run seeds        (from backend/, or `npm run db:seeds` from the repo root)
 *   node seeds.js
 *
 * The account is created when it is missing. When it already exists its
 * password, role and active flag are refreshed, so the credentials below
 * always work.
 */
import "./src/config/env.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./src/config/db.js";
import User from "./src/models/User.js";
import SystemConfig from "./src/models/SystemConfig.js";

const ADMIN = {
  name: "Admin",
  email: "mukeshimanakevin20@gmail.com",
  password: "Blandine@250",
  role: "admin",
  isActive: true,
};

/**
 * Default rows for the admin "System Configuration" screen.
 * `$setOnInsert` keeps values edited in the UI when the seed is re-run.
 */
const CONFIG = [
  {
    key: "temperature_threshold",
    value: {
      current: 35,
      label: "Temperature Alert Threshold",
      description: "Notify when the room gets hotter than this",
      type: "range",
      group: "Climate",
      group_icon: "thermometer",
      group_color: "warning",
      min: 20,
      max: 50,
      unit: "°C",
      order: 1,
    },
  },
  {
    key: "humidity_threshold",
    value: {
      current: 70,
      label: "Humidity Alert Threshold",
      description: "Notify when humidity rises above this level",
      type: "range",
      group: "Climate",
      group_icon: "thermometer",
      group_color: "warning",
      min: 20,
      max: 100,
      unit: "%",
      order: 2,
    },
  },
  {
    key: "gas_alert_enabled",
    value: {
      current: true,
      label: "Gas Leak Alerts",
      description: "Sound the buzzer when gas is detected",
      type: "toggle",
      group: "Safety",
      group_icon: "flame",
      group_color: "destructive",
      order: 3,
    },
  },
  {
    key: "gas_threshold",
    value: {
      current: 400,
      label: "Gas Sensitivity",
      description: "Lower values make the sensor more sensitive",
      type: "range",
      group: "Safety",
      group_icon: "flame",
      group_color: "destructive",
      min: 100,
      max: 1000,
      unit: "ppm",
      order: 4,
    },
  },
  {
    key: "parking_slots",
    value: {
      current: 2,
      label: "Parking Slots",
      description: "Number of managed parking spaces",
      type: "counter",
      group: "Parking",
      group_icon: "car",
      group_color: "info",
      min: 1,
      max: 4,
      order: 5,
    },
  },
  {
    key: "gate_auto_close",
    value: {
      current: true,
      label: "Auto-close Gate",
      description: "Close the parking gate automatically after entry",
      type: "toggle",
      group: "Parking",
      group_icon: "car",
      group_color: "info",
      order: 6,
    },
  },
  {
    key: "buzzer_enabled",
    value: {
      current: true,
      label: "Alarm Buzzer",
      description: "Allow the alarm buzzer to be triggered",
      type: "toggle",
      group: "Alerts",
      group_icon: "bell",
      group_color: "accent",
      order: 7,
    },
  },
  {
    key: "alarm_mode",
    value: {
      current: "Sound",
      label: "Alarm Mode",
      description: "How the system reacts to an alert",
      type: "select",
      group: "Alerts",
      group_icon: "bell",
      group_color: "accent",
      options: ["Silent", "Sound", "Both"],
      order: 8,
    },
  },
  {
    key: "notifications_enabled",
    value: {
      current: true,
      label: "Dashboard Notifications",
      description: "Show toast notifications inside the dashboard",
      type: "toggle",
      group: "Alerts",
      group_icon: "bell",
      group_color: "accent",
      order: 9,
    },
  },
];

async function seed() {
  await connectDB();

  const password = await bcrypt.hash(ADMIN.password, 10);
  const existing = await User.findOne({ email: ADMIN.email });

  if (existing) {
    existing.name = ADMIN.name;
    existing.password = password;
    existing.role = ADMIN.role;
    existing.isActive = ADMIN.isActive;
    await existing.save();
    console.log(`[seeds] admin updated: ${ADMIN.email}`);
  } else {
    await User.create({ ...ADMIN, password });
    console.log(`[seeds] admin created: ${ADMIN.email}`);
  }

  console.log(`[seeds] email:    ${ADMIN.email}`);
  console.log(`[seeds] password: ${ADMIN.password}`);
  console.log(`[seeds] role:     ${ADMIN.role}`);

  for (const item of CONFIG) {
    await SystemConfig.updateOne(
      { key: item.key },
      { $setOnInsert: { key: item.key, value: item.value } },
      { upsert: true },
    );
  }
  console.log(`[seeds] ${CONFIG.length} system config items ensured`);

  await disconnectDB();
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seeds] failed:", err);
  process.exit(1);
});
