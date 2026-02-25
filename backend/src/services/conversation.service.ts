import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";

export async function getOrCreateConversation(params: {
companyId: mongoose.Types.ObjectId;
channel: string;
externalUserId: string;
telefono?: string;
}) {
const { companyId, channel, externalUserId, telefono } = params;

const existing = await Conversation.findOne({ companyId, channel, externalUserId });
if (existing) {
  if (telefono && !existing.telefono) existing.telefono = telefono;
  await existing.save();
  return existing;
}

return Conversation.create({
  companyId,
  channel,
  externalUserId,
  telefono: telefono ?? "",
  step: "idle",
  data: {}
});
}