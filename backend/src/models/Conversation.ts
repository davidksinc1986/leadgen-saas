import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
{
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  channel: { type: String, required: true, index: true },
  externalUserId: { type: String, required: true, index: true },
  telefono: { type: String, default: "" },
  step: { type: String, default: "idle", index: true },
  data: { type: Object, default: {} }
},
{ timestamps: true }
);

ConversationSchema.index({ companyId: 1, channel: 1, externalUserId: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", ConversationSchema);
export type ConversationDoc = mongoose.InferSchemaType<typeof ConversationSchema> & { _id: mongoose.Types.ObjectId };
