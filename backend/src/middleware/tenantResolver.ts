import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";

declare global {
namespace Express {
  interface Request {
    companyId?: mongoose.Types.ObjectId;
    user?: { userId: string; companyId: string; role: string };
  }
}
}

export function tenantResolver(req: Request, _res: Response, next: NextFunction) {
const raw = req.header(env.tenantHeader);
if (raw && mongoose.isValidObjectId(raw)) {
  req.companyId = new mongoose.Types.ObjectId(raw);
}
next();
}