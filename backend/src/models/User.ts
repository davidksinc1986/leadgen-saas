import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
{
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  email: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },

  name: { type: String, default: "" },
  whatsappNumber: { type: String, default: "" }, // ej: 57300...
  role: { type: String, enum: ["admin", "agent"], default: "admin" }
},
{ timestamps: true }
);

UserSchema.index({ companyId: 1, email: 1 }, { unique: true });

export const User = mongoose.model("User", UserSchema);
export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
