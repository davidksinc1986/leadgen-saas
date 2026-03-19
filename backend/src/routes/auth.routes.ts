import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const authRouter = Router();

const workspaceRoles = ["company_admin", "admin", "agent"] as const;

function signToken(user: { _id: unknown; role: string; companyId?: unknown }) {
  return jwt.sign(
    {
      userId: String(user._id),
      companyId: user.companyId ? String(user.companyId) : null,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as unknown as jwt.SignOptions["expiresIn"] }
  );
}

authRouter.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const { email, password } = schema.parse(req.body);
  const normalizedEmail = email.trim().toLowerCase();

  const matches = await User.find({ email: normalizedEmail, role: { $in: workspaceRoles } }).limit(2);
  if (matches.length === 0) return res.status(401).json({ error: "Invalid credentials" });
  if (matches.length > 1) {
    return res.status(409).json({
      error: "Multiple workspaces found for this email. Contact support to merge the account before signing in."
    });
  }

  const user = matches[0];
  if (!user.isActive) return res.status(403).json({ error: "User is blocked" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  res.json({
    token,
    user: {
      companyId: user.companyId ? String(user.companyId) : null,
      role: user.role,
      name: user.name || normalizedEmail
    }
  });
});

authRouter.post("/super/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const { email, password } = schema.parse(req.body);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, role: "super_admin" });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (!user.isActive) return res.status(403).json({ error: "User is blocked" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  res.json({
    token,
    user: {
      companyId: null,
      role: user.role,
      name: user.name || normalizedEmail
    }
  });
});
