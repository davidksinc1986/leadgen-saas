import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { log } from "../config/logger.js";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  log.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      details: err.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({ error: err.message ?? "Validation Error" });
  }

  if (typeof err?.status === "number" && typeof err?.message === "string") {
    return res.status(err.status).json({ error: err.message });
  }

  return res.status(500).json({ error: err?.message || "Internal Server Error" });
}
