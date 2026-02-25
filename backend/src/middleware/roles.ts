import { Request, Response, NextFunction } from "express";

export function requireRole(role: "admin" | "agent") {
return (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
  next();
};
}