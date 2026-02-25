import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { User } from "../models/User.js";

export const agentRouter = Router();

agentRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
const companyId = req.companyId!;
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  whatsappNumber: z.string().min(6).optional()
});

const body = schema.parse(req.body);
const passwordHash = await bcrypt.hash(body.password, 10);

try {
  const agent = await User.create({
    companyId,
    email: body.email,
    passwordHash,
    role: "agent",
    name: body.name ?? "",
    whatsappNumber: body.whatsappNumber ?? ""
  });

  return res.json({ agentId: String(agent._id) });
} catch (err: any) {
  if (err?.code === 11000) {
    return res.status(409).json({ error: "Agent already exists for this company (email duplicate)" });
  }
  throw err;
}
});

agentRouter.get("/", requireAuth, requireRole("admin"), async (req, res) => {
const companyId = req.companyId!;
const agents = await User.find({ companyId, role: "agent" }).select("_id email name whatsappNumber createdAt updatedAt");
res.json({ agents });
});
