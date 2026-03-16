import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Company } from "../models/Company.js";
import { Lead } from "../models/Lead.js";
import { User } from "../models/User.js";
import { encrypt } from "../utils/crypto.js";

export const companySettingsRouter = Router();

companySettingsRouter.get("/me", requireAuth, requireRole(["company_admin", "agent"]), async (req, res) => {
  const companyId = req.companyId!;
  const company = await Company.findById(companyId);
  res.json({ company });
});

companySettingsRouter.patch("/me/notifications", requireAuth, requireRole("company_admin"), async (req, res) => {
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


companySettingsRouter.patch("/me/branding", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    logoUrl: z.string().url().or(z.literal("")).optional(),
    appTitle: z.string().max(120).optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    neutralColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    themePreset: z.string().min(2).max(60).optional()
  });

  const body = schema.parse(req.body);
  const set = Object.fromEntries(Object.entries(body).map(([k, v]) => [`branding.${k}`, v]));

  const company = await Company.findByIdAndUpdate(companyId, { $set: set }, { new: true });
  res.json({ company });
});

companySettingsRouter.patch("/me/calendar", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(["none", "google", "outlook", "apple"]).optional(),
    calendarEmail: z.string().email().or(z.literal("")).optional(),
    syncMode: z.enum(["two_way", "read_only", "write_only"]).optional(),
    timezone: z.string().min(2).max(80).optional()
  });

  const body = schema.parse(req.body);
  const set: Record<string, unknown> = Object.fromEntries(Object.entries(body).map(([k, v]) => [`calendarSync.${k}`, v]));
  if (Object.keys(set).length > 0) set["calendarSync.lastSyncAt"] = new Date();

  const company = await Company.findByIdAndUpdate(companyId, { $set: set }, { new: true });
  res.json({ company });
});
companySettingsRouter.patch("/me/business", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    leadGoal: z.enum(["appointment", "lead"]).optional(),
    languages: z
      .object({
        primary: z.string().min(2).optional(),
        enabled: z.array(z.string().min(2)).min(1).optional()
      })
      .optional(),
    integrations: z
      .object({
        whatsapp: z.object({ enabled: z.boolean().optional(), provider: z.string().optional() }).optional(),
        facebook: z.object({ enabled: z.boolean().optional() }).optional(),
        messenger: z.object({ enabled: z.boolean().optional() }).optional(),
        instagram: z.object({ enabled: z.boolean().optional() }).optional(),
        tiktok: z.object({ enabled: z.boolean().optional() }).optional(),
        elevenLabs: z
          .object({ enabled: z.boolean().optional(), voiceId: z.string().optional(), apiKey: z.string().optional() })
          .optional(),
        salesforce: z
          .object({
            enabled: z.boolean().optional(),
            instanceUrl: z.string().url().optional(),
            clientId: z.string().optional(),
            clientSecret: z.string().optional()
          })
          .optional()
      })
      .optional()
  });

  const body = schema.parse(req.body);
  const update: Record<string, unknown> = {};

  if (body.leadGoal) update.leadGoal = body.leadGoal;
  if (body.languages) update.languages = body.languages;

  if (body.integrations?.whatsapp) update["integrations.whatsapp"] = body.integrations.whatsapp;
  if (body.integrations?.facebook) update["integrations.facebook"] = body.integrations.facebook;
  if (body.integrations?.messenger) update["integrations.messenger"] = body.integrations.messenger;
  if (body.integrations?.instagram) update["integrations.instagram"] = body.integrations.instagram;
  if (body.integrations?.tiktok) update["integrations.tiktok"] = body.integrations.tiktok;
  if (body.integrations?.elevenLabs) {
    update["integrations.elevenLabs"] = {
      enabled: body.integrations.elevenLabs.enabled,
      voiceId: body.integrations.elevenLabs.voiceId,
      ...(body.integrations.elevenLabs.apiKey ? { apiKeyEnc: encrypt(body.integrations.elevenLabs.apiKey) } : {})
    };
  }
  if (body.integrations?.salesforce) {
    update["integrations.salesforce"] = {
      enabled: body.integrations.salesforce.enabled,
      instanceUrl: body.integrations.salesforce.instanceUrl,
      clientId: body.integrations.salesforce.clientId,
      ...(body.integrations.salesforce.clientSecret
        ? { clientSecretEnc: encrypt(body.integrations.salesforce.clientSecret) }
        : {})
    };
  }

  const company = await Company.findByIdAndUpdate(companyId, { $set: update }, { new: true });
  res.json({ company });
});

companySettingsRouter.get("/me/stats", requireAuth, requireRole(["company_admin", "agent"]), async (req, res) => {
  const companyId = req.companyId!;
  const userRole = req.user?.role;

  const match: Record<string, unknown> = { companyId };
  if (userRole === "agent") match.assignedAgentId = new mongoose.Types.ObjectId(req.user!.userId);

  const [summary, byStatus, byAgent] = await Promise.all([
    Lead.countDocuments(match),
    Lead.aggregate([{ $match: match }, { $group: { _id: "$estado", total: { $sum: 1 } } }]),
    userRole === "agent"
      ? Promise.resolve([])
      : Lead.aggregate([
          { $match: { companyId, assignedAgentId: { $ne: null } } },
          { $group: { _id: "$assignedAgentId", leads: { $sum: 1 }, contacted: { $sum: { $cond: [{ $eq: ["$estado", "contactado"] }, 1, 0] } } } }
        ])
  ]);

  res.json({
    summary: { totalLeads: summary },
    byStatus,
    byAgent
  });
});

companySettingsRouter.get("/users", requireAuth, requireRole("company_admin"), async (req, res) => {
  const companyId = req.companyId!;
  const users = await User.find({ companyId, role: { $in: ["company_admin", "agent", "admin"] } }).select(
    "_id role email name whatsappNumber profileVerified autoReplyEnabled preferredLanguages"
  );
  res.json({ users });
});

companySettingsRouter.delete("/users/:userId", requireAuth, requireRole(["company_admin", "super_admin"]), async (req, res) => {
  const schema = z.object({ confirmationText: z.literal("DELETE") });
  schema.parse(req.body);

  const companyId = req.companyId;
  const query = companyId ? { _id: req.params.userId, companyId } : { _id: req.params.userId };

  const user = await User.findOne(query);
  if (!user) return res.status(404).json({ error: "Not found" });

  if (String(user._id) === req.user?.userId) {
    return res.status(400).json({ error: "You cannot delete your own user" });
  }

  if (user.systemProtected) {
    return res.status(403).json({ error: "System protected user cannot be deleted" });
  }

  await user.deleteOne();
  res.json({ ok: true });
});
