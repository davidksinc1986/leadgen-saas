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
