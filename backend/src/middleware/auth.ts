import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import mongoose from "mongoose";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
const auth = req.header("Authorization") ?? "";
const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
if (!token) return res.status(401).json({ error: "Unauthorized" });

try {
  const payload = jwt.verify(token, env.jwtSecret) as any;
  req.user = { userId: payload.userId, companyId: payload.companyId ?? "", role: payload.role };
  req.companyId = req.companyId ?? (payload.companyId && mongoose.isValidObjectId(payload.companyId) ? new mongoose.Types.ObjectId(payload.companyId) : undefined);
  return next();
} catch {
  return res.status(401).json({ error: "Unauthorized" });
}
}