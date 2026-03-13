import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";

export const agentRouter = Router();

agentRouter.post("/", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
    whatsappNumber: z.string().min(6).optional()
  });

  const body = schema.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 10);

  const company = await Company.findById(companyId).select("limits");
  const maxAgents = company?.limits?.maxAgents ?? 20;
  const currentAgents = await User.countDocuments({ companyId, role: "agent" });
  if (currentAgents >= maxAgents) {
    return res.status(400).json({ error: `Agent limit reached (${maxAgents})` });
  }

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

agentRouter.get("/", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const agents = await User.find({ companyId, role: "agent" }).select(
    "_id email name whatsappNumber profileVerified autoReplyEnabled preferredLanguages createdAt updatedAt"
  );
  res.json({ agents });
});

agentRouter.patch("/me/profile", requireAuth, requireRole("agent"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    whatsappNumber: z.string().min(6).optional(),
    profileVerified: z.boolean().optional(),
    profileImageUrl: z.string().url().optional(),
    autoReplyEnabled: z.boolean().optional(),
    preferredLanguages: z.array(z.string().min(2)).optional()
  });

  const body = schema.parse(req.body);
  const agent = await User.findByIdAndUpdate(req.user!.userId, { $set: body }, { new: true }).select(
    "_id email name whatsappNumber profileVerified profileImageUrl autoReplyEnabled preferredLanguages"
  );

  res.json({ agent });
});
