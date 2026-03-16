import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth, requireRole("super_admin"));

superAdminRouter.get("/overview", async (_req, res) => {
  const [users, companies] = await Promise.all([User.countDocuments({}), Company.countDocuments({})]);
  const [superUsers, companyAdmins, agents] = await Promise.all([
    User.countDocuments({ role: "super_admin" }),
    User.countDocuments({ role: { $in: ["company_admin", "admin"] } }),
    User.countDocuments({ role: "agent" })
  ]);

  res.json({ users, companies, superUsers, companyAdmins, agents });
});

superAdminRouter.get("/users", async (_req, res) => {
  const users = await User.find({})
    .populate("companyId", "name slug")
    .select("_id companyId email role name isActive systemProtected createdAt updatedAt")
    .sort({ createdAt: -1 });

  res.json({ users });
});

superAdminRouter.post("/users", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["super_admin", "company_admin", "admin", "agent"]),
    companyId: z.string().optional(),
    name: z.string().optional(),
    isActive: z.boolean().optional()
  });

  const body = schema.parse(req.body);

  if (body.role !== "super_admin" && (!body.companyId || !mongoose.isValidObjectId(body.companyId))) {
    return res.status(400).json({ error: "companyId is required for non super-admin users" });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await User.create({
    email: body.email,
    passwordHash,
    role: body.role,
    companyId: body.role === "super_admin" ? undefined : body.companyId,
    name: body.name ?? "",
    isActive: body.isActive ?? true,
    systemProtected: false
  });

  res.status(201).json({ userId: String(user._id) });
});

superAdminRouter.patch("/users/:userId", async (req, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["super_admin", "company_admin", "admin", "agent"]).optional(),
    companyId: z.string().optional(),
    name: z.string().optional(),
    isActive: z.boolean().optional()
  });

  const body = schema.parse(req.body);
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "Not found" });

  if (user.systemProtected && body.role && body.role !== "super_admin") {
    return res.status(403).json({ error: "System protected user role cannot be downgraded" });
  }

  if (user.systemProtected && body.isActive === false) {
    return res.status(403).json({ error: "System protected user cannot be blocked" });
  }

  if (body.role && body.role !== "super_admin") {
    const targetCompany = body.companyId ?? (user.companyId ? String(user.companyId) : "");
    if (!targetCompany || !mongoose.isValidObjectId(targetCompany)) {
      return res.status(400).json({ error: "companyId is required for non super-admin users" });
    }
    user.companyId = new mongoose.Types.ObjectId(targetCompany);
  }

  if (body.role === "super_admin") {
    user.companyId = undefined as never;
  }

  if (body.email) user.email = body.email;
  if (body.name !== undefined) user.name = body.name;
  if (body.role) user.role = body.role;
  if (body.isActive !== undefined) user.isActive = body.isActive;
  if (body.password) user.passwordHash = await bcrypt.hash(body.password, 10);

  await user.save();
  res.json({ user });
});

superAdminRouter.delete("/users/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.systemProtected) return res.status(403).json({ error: "System protected user cannot be deleted" });

  await user.deleteOne();
  res.json({ ok: true });
});

superAdminRouter.get("/companies", async (_req, res) => {
  const companies = await Company.find({}).sort({ createdAt: -1 });
  res.json({ companies });
});

superAdminRouter.post("/companies", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/)
  });

  const body = schema.parse(req.body);
  const existing = await Company.findOne({ slug: body.slug });
  if (existing) return res.status(409).json({ error: "Slug already exists" });

  const company = await Company.create({ name: body.name, slug: body.slug });
  res.status(201).json({ company });
});

superAdminRouter.patch("/companies/:companyId", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional()
  });
  const body = schema.parse(req.body);

  if (body.slug) {
    const duplicate = await Company.findOne({ slug: body.slug, _id: { $ne: req.params.companyId } });
    if (duplicate) return res.status(409).json({ error: "Slug already exists" });
  }

  const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: body }, { new: true });
  if (!company) return res.status(404).json({ error: "Not found" });
  res.json({ company });
});

superAdminRouter.delete("/companies/:companyId", async (req, res) => {
  const company = await Company.findById(req.params.companyId);
  if (!company) return res.status(404).json({ error: "Not found" });

  await User.deleteMany({ companyId: company._id, systemProtected: false });
  await company.deleteOne();
  res.json({ ok: true });
});

superAdminRouter.patch("/companies/:companyId/limits", async (req, res) => {
  const schema = z.object({
    maxCompanyAdmins: z.number().int().min(1).max(100).optional(),
    maxAgents: z.number().int().min(1).max(10000).optional()
  });

  const body = schema.parse(req.body);
  const company = await Company.findByIdAndUpdate(
    req.params.companyId,
    {
      $set: {
        ...(body.maxCompanyAdmins !== undefined ? { "limits.maxCompanyAdmins": body.maxCompanyAdmins } : {}),
        ...(body.maxAgents !== undefined ? { "limits.maxAgents": body.maxAgents } : {})
      }
    },
    { new: true }
  );

  if (!company) return res.status(404).json({ error: "Not found" });
  res.json({ company });
});

superAdminRouter.patch("/companies/:companyId/branding", async (req, res) => {
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
  const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: set }, { new: true });
  if (!company) return res.status(404).json({ error: "Not found" });
  res.json({ company });
});

superAdminRouter.patch("/companies/:companyId/calendar", async (req, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(["none", "google", "outlook", "apple"]).optional(),
    calendarEmail: z.string().email().or(z.literal("")).optional(),
    syncMode: z.enum(["two_way", "read_only", "write_only"]).optional(),
    timezone: z.string().min(2).max(80).optional()
  });

  const body = schema.parse(req.body);
  const set: Record<string, unknown> = Object.fromEntries(Object.entries(body).map(([k, v]) => [`calendarSync.${k}`, v]));
  if (Object.keys(set).length > 0) {
    set["calendarSync.lastSyncAt"] = new Date();
  }

  const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: set }, { new: true });
  if (!company) return res.status(404).json({ error: "Not found" });
  res.json({ company });
});
