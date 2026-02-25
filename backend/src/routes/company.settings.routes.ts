import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Company } from "../models/Company.js";

export const companySettingsRouter = Router();

companySettingsRouter.get("/me", requireAuth, requireRole("admin"), async (req, res) => {
const companyId = req.companyId!;
const company = await Company.findById(companyId);
res.json({ company });
});

companySettingsRouter.patch("/me/notifications", requireAuth, requireRole("admin"), async (req, res) => {
const companyId = req.companyId!;
const schema = z.object({
  email: z
    .object({
      enabled: z.boolean().optional(),
      to: z.array(z.string().email()).optional()
    })
    .optional(),
  whatsapp: z
    .object({
      enabled: z.boolean().optional(),
      to: z.array(z.string().min(6)).optional()
    })
    .optional()
});

const body = schema.parse(req.body);

const company = await Company.findByIdAndUpdate(
  companyId,
  {
    $set: {
      ...(body.email ? { "notifications.email": { ...body.email } } : {}),
      ...(body.whatsapp ? { "notifications.whatsapp": { ...body.whatsapp } } : {})
    }
  },
  { new: true }
);

res.json({ company });
});