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

  const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(300);
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

leadRouter.patch("/:id/workflow", requireAuth, async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  const query: Record<string, unknown> = { _id: id, companyId };
  if (req.user?.role === "agent") {
    query.assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);
  }

  const payload = req.body as {
    leadScore?: number;
    priority?: "low" | "medium" | "high";
    nextFollowUpAt?: string | null;
    followUpStatus?: "pending" | "done" | "overdue";
    followUpNotes?: string;
    tags?: string[];
    markContacted?: boolean;
  };

  const now = new Date();
  const nextFollowUpDate = payload.nextFollowUpAt ? new Date(payload.nextFollowUpAt) : null;

  const update: Record<string, unknown> = {
    ...(typeof payload.leadScore === "number" ? { leadScore: Math.max(0, Math.min(100, payload.leadScore)) } : {}),
    ...(payload.priority ? { priority: payload.priority } : {}),
    ...(payload.followUpStatus ? { followUpStatus: payload.followUpStatus } : {}),
    ...(typeof payload.followUpNotes === "string" ? { followUpNotes: payload.followUpNotes.trim().slice(0, 1000) } : {}),
    ...(payload.tags ? { tags: payload.tags.slice(0, 12).map((tag) => tag.trim()).filter(Boolean) } : {}),
    ...(payload.nextFollowUpAt !== undefined ? { nextFollowUpAt: nextFollowUpDate } : {})
  };

  if (payload.markContacted) {
    update.estado = "contactado";
    update.lastContactedAt = now;
  }

  if (nextFollowUpDate && nextFollowUpDate.getTime() < now.getTime()) {
    update.followUpStatus = "overdue";
  }

  const lead = await Lead.findOneAndUpdate(query, { $set: update }, { new: true });
  if (!lead) return res.status(404).json({ error: "Not found" });

  res.json({ lead });
});
