import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
const schema = z.object({
  companyId: z.string(),
  email: z.string().email(),
  password: z.string().min(1)
});
const { companyId, email, password } = schema.parse(req.body);

if (!mongoose.isValidObjectId(companyId)) return res.status(400).json({ error: "Invalid companyId" });

const user = await User.findOne({ companyId, email });
if (!user) return res.status(401).json({ error: "Invalid credentials" });

const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ error: "Invalid credentials" });

const token = jwt.sign(
  { userId: String(user._id), companyId: String(companyId), role: user.role },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }
);

res.json({ token });
});