import { z } from "zod";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(["admin", "user", "guest"]).optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().optional(),
});

export const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    message: "Users",
    data: users,
    meta: { page, limit, total },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.json({ success: true, message: "User", data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  const user = await User.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.json({ success: true, message: "User updated", data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.json({ success: true, message: "User deleted", data: null });
});

export default { listUsers, getUser, updateUser, deleteUser };
