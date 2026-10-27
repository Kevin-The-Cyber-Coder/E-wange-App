import "../src/config/env.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Device from "../src/models/Device.js";

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || "Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@e-wange.local",
  password: process.env.SEED_ADMIN_PASSWORD || "admin123",
};

const DEVICES = [
  { name: "Living Room Lamp", key: "lamp", type: "light", room: "Living Room" },
  { name: "Ceiling Fan", key: "fan", type: "fan", room: "Living Room" },
  { name: "Curtains", key: "curtains", type: "curtain", room: "Living Room" },
  { name: "Alarm Buzzer", key: "buzzer", type: "buzzer", room: "Hallway" },
  { name: "Water Pump", key: "water_pump", type: "pump", room: "Utility" },
  { name: "Main Door", key: "main_door", type: "door", room: "Entrance" },
  { name: "Parking Gate", key: "parking_gate", type: "gate", room: "Parking" },
];

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: ADMIN.email });

  if (existing) {
    console.log(`[seed] admin already exists: ${ADMIN.email}`);
  } else {
    const password = await bcrypt.hash(ADMIN.password, 10);
    await User.create({ ...ADMIN, password, role: "admin" });
    console.log(`[seed] admin created: ${ADMIN.email} / ${ADMIN.password}`);
  }

  for (const device of DEVICES) {
    await Device.updateOne({ key: device.key }, { $setOnInsert: device }, { upsert: true });
  }
  console.log(`[seed] ${DEVICES.length} devices ensured`);

  await disconnectDB();
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
