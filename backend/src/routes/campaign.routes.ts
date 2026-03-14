import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Campaign } from "../models/Campaign.js";

export const campaignRouter = Router();

campaignRouter.get("/", requireAuth, async (req, res) => {
  const campaigns = await Campaign.find({ companyId: req.companyId! }).sort({ createdAt: -1 }).limit(200);
  res.json({ campaigns });
});

campaignRouter.post("/", requireAuth, async (req, res) => {
  const payload = req.body as {
    name: string;
    channel?: string;
    sourceTag: string;
    budget?: number;
    spent?: number;
    impressions?: number;
    clicks?: number;
    cplGoal?: number;
    cvrGoal?: number;
    startDate?: string;
    endDate?: string | null;
    status?: "draft" | "active" | "paused" | "completed";
    notes?: string;
  };

  const campaign = await Campaign.create({
    ...payload,
    companyId: req.companyId!,
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    endDate: payload.endDate ? new Date(payload.endDate) : null
  });

  res.status(201).json({ campaign });
});

campaignRouter.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;

  if (updates.startDate && typeof updates.startDate === "string") {
    updates.startDate = new Date(updates.startDate);
  }
  if (updates.endDate && typeof updates.endDate === "string") {
    updates.endDate = new Date(updates.endDate);
  }

  const campaign = await Campaign.findOneAndUpdate({ _id: id, companyId: req.companyId! }, { $set: updates }, { new: true });
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  res.json({ campaign });
});
