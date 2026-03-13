import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";

export const companyUsersRouter = Router();

companyUsersRouter.post("/company-admins", requireAuth, requireRole("company_admin"), async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional()
  });

  const body = schema.parse(req.body);
  const companyId = req.companyId!;

  const company = await Company.findById(companyId).select("limits");
  const maxAdmins = company?.limits?.maxCompanyAdmins ?? 3;
  const currentAdmins = await User.countDocuments({ companyId, role: { $in: ["company_admin", "admin"] } });
  if (currentAdmins >= maxAdmins) {
    return res.status(400).json({ error: `Company admin limit reached (${maxAdmins})` });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const admin = await User.create({
    companyId,
    email: body.email,
    passwordHash,
    name: body.name ?? "",
    role: "company_admin"
  });

  res.json({ companyAdminId: String(admin._id) });
});

companyUsersRouter.get("/company-admins", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const admins = await User.find({ companyId, role: { $in: ["company_admin", "admin"] } }).select(
    "_id email name role createdAt updatedAt"
  );
  res.json({ admins });
});
