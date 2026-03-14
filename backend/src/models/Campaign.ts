import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true },
    channel: { type: String, enum: ["meta_ads", "google_ads", "email", "whatsapp", "organic", "other"], default: "other" },
    sourceTag: { type: String, required: true },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cplGoal: { type: Number, default: 0 },
    cvrGoal: { type: Number, default: 0 },
    startDate: { type: Date, default: () => new Date() },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ["draft", "active", "paused", "completed"], default: "draft", index: true },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

CampaignSchema.index({ companyId: 1, sourceTag: 1 }, { unique: true });

export type CampaignShape = mongoose.InferSchemaType<typeof CampaignSchema>;
export const Campaign = mongoose.model<CampaignShape>("Campaign", CampaignSchema);
