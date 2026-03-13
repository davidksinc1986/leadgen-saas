import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

export const companyRouter = Router();

companyRouter.post("/bootstrap", async (req, res) => {
  const schema = z.object({
    companyName: z.string().min(2),
    slug: z.string().min(2),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(6)
  });

  const { companyName, slug, adminEmail, adminPassword } = schema.parse(req.body);

  const company = await Company.create({ name: companyName, slug });

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({ companyId: company._id, email: adminEmail, passwordHash, role: "company_admin" });

  res.json({ companyId: String(company._id) });
});

companyRouter.get("/", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const companies = await Company.find({}).sort({ createdAt: -1 });
  res.json({ companies });
});

companyRouter.delete("/:companyId", requireAuth, requireRole("super_admin"), async (req, res) => {
  const schema = z.object({ confirmationText: z.string().min(1) });
  const { confirmationText } = schema.parse(req.body);

  const company = await Company.findById(req.params.companyId);
  if (!company) return res.status(404).json({ error: "Not found" });

  if (confirmationText !== company.slug) {
    return res.status(400).json({ error: `Confirmation text must match company slug: ${company.slug}` });
  }

  await User.deleteMany({ companyId: company._id });
  await company.deleteOne();
  res.json({ ok: true });
});
