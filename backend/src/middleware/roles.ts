import { Request, Response, NextFunction } from "express";

const normalizeRole = (role: string) => (role === "admin" ? "company_admin" : role);

export function requireRole(role: "company_admin" | "agent" | "super_admin" | Array<"company_admin" | "agent" | "super_admin">) {
  const roles = new Set(Array.isArray(role) ? role : [role]);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const currentRole = normalizeRole(req.user.role);
    if (currentRole === "super_admin") return next();
    if (!roles.has(currentRole as "company_admin" | "agent" | "super_admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
