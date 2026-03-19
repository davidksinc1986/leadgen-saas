import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    notes: { type: String, default: "" },
    channel: { type: String, enum: ["whatsapp", "instagram", "messenger", "webchat", "manual"], default: "manual" },
    timezone: { type: String, default: "UTC" },
    scheduledFor: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
      default: "scheduled",
      index: true
    },
    source: { type: String, default: "manual" },
    confirmationSentAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

AppointmentSchema.index({ companyId: 1, assignedAgentId: 1, scheduledFor: 1 });

export type AppointmentShape = mongoose.InferSchemaType<typeof AppointmentSchema>;
export type AppointmentDoc = mongoose.HydratedDocument<AppointmentShape>;
export const Appointment = mongoose.model<AppointmentShape>("Appointment", AppointmentSchema);
