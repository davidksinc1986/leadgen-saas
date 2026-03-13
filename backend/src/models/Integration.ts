import mongoose from "mongoose";

const IntegrationSchema = new mongoose.Schema(
 {
   companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

   channel: { type: String, enum: ["whatsapp", "facebook", "messenger", "instagram", "tiktok"], required: true, index: true },
   name: { type: String, default: "" },
   enabled: { type: Boolean, default: false },

   // IDs del proveedor
   meta: {
     phoneNumberId: { type: String, default: "" }, // WhatsApp Cloud API
     wabaId: { type: String, default: "" },
     pageId: { type: String, default: "" }, // Messenger
     igUserId: { type: String, default: "" }, // Instagram
     fbPageId: { type: String, default: "" },
     tiktokAccountId: { type: String, default: "" }
   },

   // Webhook verify token (Meta GET challenge)
   verifyToken: { type: String, default: "" },

   // Secret para firma X-Hub-Signature-256 (Meta App Secret)
   appSecretEnc: { type: String, default: "" },

   // Access token (page token / wa token)
   accessTokenEnc: { type: String, default: "" },

   // Para elegir “default integration” por canal
   isDefault: { type: Boolean, default: false }
 },
 { timestamps: true }
);

IntegrationSchema.index({ companyId: 1, channel: 1, isDefault: 1 });

export const Integration = mongoose.model("Integration", IntegrationSchema);
export type IntegrationDoc = mongoose.InferSchemaType<typeof IntegrationSchema> & { _id: mongoose.Types.ObjectId };
