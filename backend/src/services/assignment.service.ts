import mongoose from "mongoose";
import { User } from "../models/User.js";

export async function assignAgentRoundRobin(companyId: mongoose.Types.ObjectId) {
const agent = await User.findOne({ companyId, role: "agent" }).sort({ updatedAt: 1 });
if (!agent) return null;

// “toca” updatedAt para rotar el siguiente
agent.updatedAt = new Date();
await agent.save();
return agent;
}