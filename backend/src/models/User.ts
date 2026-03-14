import mongoose from "mongoose";

export const USER_ROLES = ["super_admin", "company_admin", "admin", "agent"] as const;

const UserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: function (this: { role: string }) {
        return this.role !== "super_admin";
      },
      index: true
    },
    email: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },

    name: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    role: { type: String, enum: USER_ROLES, default: "company_admin" },

    isActive: { type: Boolean, default: true, index: true },
    systemProtected: { type: Boolean, default: false, index: true },

    profileVerified: { type: Boolean, default: false },
    profileImageUrl: { type: String, default: "" },
    autoReplyEnabled: { type: Boolean, default: true },
    preferredLanguages: { type: [String], default: ["en", "es"] }
  },
  { timestamps: true }
);

UserSchema.index({ companyId: 1, email: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true } } });
UserSchema.index({ email: 1, role: 1 }, { unique: true, partialFilterExpression: { role: "super_admin" } });

export const User = mongoose.model("User", UserSchema);
export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
