import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(["admin", "user", "guest"]).optional(),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with that email already exists");
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: role || "user",
    phone: phone || "",
  });

  await ActivityLog.create({
    type: "auth",
    message: `${user.name} registered`,
    user: user._id,
    userName: user.name,
  });

  const token = signToken({ id: user._id.toString(), role: user.role });

  res.status(201).json({
    success: true,
    message: "Account created",
    data: { user: user.toJSON(), token },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await ActivityLog.create({
    type: "auth",
    message: `${user.name} signed in`,
    user: user._id,
    userName: user.name,
  });

  const token = signToken({ id: user._id.toString(), role: user.role });

  res.json({
    success: true,
    message: "Signed in",
    data: { user: user.toJSON(), token },
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.json({ success: true, message: "Current user", data: user });
});

export default { register, login, me };
