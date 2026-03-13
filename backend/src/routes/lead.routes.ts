import mongoose from "mongoose";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Lead } from "../models/Lead.js";

export const leadRouter = Router();

leadRouter.get("/", requireAuth, async (req, res) => {
  const companyId = req.companyId!;
  const query: Record<string, unknown> = { companyId };

  if (req.user?.role === "agent") {
    query.assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);
  }

  const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(200);
  res.json({ leads });
});

leadRouter.patch("/:id/status", requireAuth, async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;
  const { estado } = req.body as { estado: "nuevo" | "contactado" | "cerrado" };

  const query: Record<string, unknown> = { _id: id, companyId };
  if (req.user?.role === "agent") {
    query.assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);
  }

  const lead = await Lead.findOneAndUpdate(query, { $set: { estado } }, { new: true });
  if (!lead) return res.status(404).json({ error: "Not found" });
  res.json({ lead });
});
