import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";

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
await User.create({ companyId: company._id, email: adminEmail, passwordHash, role: "admin" });

res.json({ companyId: String(company._id) });
});