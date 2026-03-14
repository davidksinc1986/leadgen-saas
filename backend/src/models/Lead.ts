import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
{
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

  nombre: { type: String, default: "" },
  telefono: { type: String, required: true, index: true },

  presupuesto: { type: String, default: "" },
  interes: { type: String, default: "" },
  ubicacion: { type: String, default: "" },
  tiempoCompra: { type: String, default: "" },

  fecha: { type: Date, default: () => new Date() },
  estado: { type: String, enum: ["nuevo", "contactado", "cerrado"], default: "nuevo", index: true },

  source: { type: String, default: "" },
  lastMessageAt: { type: Date, default: () => new Date() },

  qualifiedAt: { type: Date, default: null },
  assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  leadScore: { type: Number, default: 40, min: 0, max: 100, index: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
  lastContactedAt: { type: Date, default: null },
  nextFollowUpAt: { type: Date, default: null, index: true },
  followUpStatus: { type: String, enum: ["pending", "done", "overdue"], default: "pending", index: true },
  followUpNotes: { type: String, default: "" },
  tags: { type: [String], default: [] },

  notifications: {
    emailNotifiedAt: { type: Date, default: null },
    whatsappNotifiedAt: { type: Date, default: null }
  },

  customFields: { type: Object, default: {} }
},
{ timestamps: true }
);

LeadSchema.index({ companyId: 1, telefono: 1 }, { unique: true });

export type LeadShape = mongoose.InferSchemaType<typeof LeadSchema>;
export type LeadDoc = mongoose.HydratedDocument<LeadShape>;

export const Lead = mongoose.model<LeadShape>("Lead", LeadSchema);
