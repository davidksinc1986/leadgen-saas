import { Request, Response, NextFunction } from "express";
import { log } from "../config/logger.js";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
log.error(err);
res.status(500).json({ error: "Internal Server Error" });
}
