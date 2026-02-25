import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Lead } from "../models/Lead.js";

export const leadRouter = Router();

leadRouter.get("/", requireAuth, async (req, res) => {
const companyId = req.companyId!;
const leads = await Lead.find({ companyId }).sort({ createdAt: -1 }).limit(200);
res.json({ leads });
});

leadRouter.patch("/:id/status", requireAuth, async (req, res) => {
const companyId = req.companyId!;
const { id } = req.params;
const { estado } = req.body as { estado: "nuevo" | "contactado" | "cerrado" };

const lead = await Lead.findOneAndUpdate({ _id: id, companyId }, { $set: { estado } }, { new: true });
if (!lead) return res.status(404).json({ error: "Not found" });
res.json({ lead });
});