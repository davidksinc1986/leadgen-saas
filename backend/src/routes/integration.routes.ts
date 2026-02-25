import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Integration } from "../models/Integration.js";
import { encrypt } from "../utils/crypto.js";

export const integrationRouter = Router();

integrationRouter.get("/", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const integrations = await Integration.find({ companyId }).select("-accessTokenEnc -appSecretEnc");
 res.json({ integrations });
});

integrationRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const schema = z.object({
   channel: z.enum(["whatsapp", "messenger", "instagram"]),
   name: z.string().min(1),
   enabled: z.boolean().optional().default(false),
   isDefault: z.boolean().optional().default(false),

   verifyToken: z.string().min(1),

   meta: z
     .object({
       phoneNumberId: z.string().optional(),
       wabaId: z.string().optional(),
       pageId: z.string().optional(),
       igUserId: z.string().optional()
     })
     .optional()
     .default({}),

   accessToken: z.string().optional().default(""),
   appSecret: z.string().optional().default("")
 });

 const body = schema.parse(req.body);

 if (body.isDefault) {
   await Integration.updateMany({ companyId, channel: body.channel }, { $set: { isDefault: false } });
 }

 const doc = await Integration.create({
   companyId,
   channel: body.channel,
   name: body.name,
   enabled: body.enabled,
   isDefault: body.isDefault,
   verifyToken: body.verifyToken,
   meta: body.meta,
   accessTokenEnc: encrypt(body.accessToken),
   appSecretEnc: encrypt(body.appSecret)
 });

 res.json({ integrationId: String(doc._id) });
});

integrationRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const id = req.params.id;

 const schema = z.object({
   name: z.string().min(1).optional(),
   enabled: z.boolean().optional(),
   isDefault: z.boolean().optional(),

   verifyToken: z.string().min(1).optional(),
   meta: z
     .object({
       phoneNumberId: z.string().optional(),
       wabaId: z.string().optional(),
       pageId: z.string().optional(),
       igUserId: z.string().optional()
     })
     .optional(),

   accessToken: z.string().optional(),
   appSecret: z.string().optional()
 });

 const body = schema.parse(req.body);

 const update: any = { ...body };
 if (body.accessToken !== undefined) update.accessTokenEnc = encrypt(body.accessToken);
 if (body.appSecret !== undefined) update.appSecretEnc = encrypt(body.appSecret);
 delete update.accessToken;
 delete update.appSecret;

 if (body.isDefault === true) {
   const existing = await Integration.findOne({ _id: id, companyId });
   if (existing) await Integration.updateMany({ companyId, channel: existing.channel }, { $set: { isDefault: false } });
 }

 const integration = await Integration.findOneAndUpdate({ _id: id, companyId }, { $set: update }, { new: true }).select(
   "-accessTokenEnc -appSecretEnc"
 );

 if (!integration) return res.status(404).json({ error: "Not found" });
 res.json({ integration });
});