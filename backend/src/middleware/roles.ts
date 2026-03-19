import { Request, Response, NextFunction } from "express";

type NormalizedRole = "company_admin" | "admin" | "agent" | "super_admin";

const normalizeRole = (role: string) => (role === "admin" ? "company_admin" : role);

export function requireRole(role: NormalizedRole | Array<NormalizedRole>) {
  const roles = new Set(Array.isArray(role) ? role : [role]);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const currentRole = normalizeRole(req.user.role);
    if (currentRole === "super_admin") return next();
    if (!roles.has(currentRole as NormalizedRole) && !(currentRole === "company_admin" && roles.has("admin"))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
