import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Appointment } from "../models/Appointment.js";
import { Company } from "../models/Company.js";
import { Lead } from "../models/Lead.js";
import { User } from "../models/User.js";

export const appointmentRouter = Router();

function parseTimeParts(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return { hours: Number.isFinite(hours) ? hours : 9, minutes: Number.isFinite(minutes) ? minutes : 0 };
}

function buildDateWithTime(date: Date, time: string) {
  const copy = new Date(date);
  const { hours, minutes } = parseTimeParts(time);
  copy.setUTCHours(hours, minutes, 0, 0);
  return copy;
}

appointmentRouter.get("/slots", requireAuth, async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    from: z.string().datetime().optional(),
    days: z.coerce.number().int().min(1).max(14).optional().default(7),
    assignedAgentId: z.string().optional()
  });
  const query = schema.parse(req.query);
  const company = await Company.findById(companyId).select("appointmentSettings");
  if (!company) return res.status(404).json({ error: "Company not found" });

  const settings = (company as any).appointmentSettings ?? {};
  const durationMin = settings.slotDurationMin ?? 30;
  const bookingNoticeHours = settings.bookingNoticeHours ?? 2;
  const weeklyAvailability = Array.isArray(settings.weeklyAvailability) ? settings.weeklyAvailability : [];
  const fromDate = query.from ? new Date(query.from) : new Date();
  const windowStart = new Date(Math.max(Date.now() + bookingNoticeHours * 60 * 60 * 1000, fromDate.getTime()));
  const windowEnd = new Date(windowStart.getTime() + query.days * 24 * 60 * 60 * 1000);

  const appointmentQuery: Record<string, unknown> = {
    companyId,
    scheduledFor: { $gte: windowStart, $lte: windowEnd },
    status: { $in: ["scheduled", "confirmed"] }
  };
  if (query.assignedAgentId && mongoose.isValidObjectId(query.assignedAgentId)) {
    appointmentQuery.assignedAgentId = new mongoose.Types.ObjectId(query.assignedAgentId);
  }

  const existingAppointments = await Appointment.find(appointmentQuery).select("scheduledFor endAt assignedAgentId");
  const busyRanges = existingAppointments.map((appointment) => ({
    start: new Date(appointment.scheduledFor).getTime(),
    end: new Date(appointment.endAt).getTime(),
    assignedAgentId: appointment.assignedAgentId ? String(appointment.assignedAgentId) : null
  }));

  const slots: Array<{ start: string; end: string; assignedAgentId?: string | null }> = [];
  for (let cursor = new Date(windowStart); cursor <= windowEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dayRule = weeklyAvailability.find((item: any) => item.dayOfWeek === cursor.getUTCDay() && item.enabled);
    if (!dayRule) continue;

    const dayStart = buildDateWithTime(cursor, dayRule.start ?? "09:00");
    const dayEnd = buildDateWithTime(cursor, dayRule.end ?? "17:00");
    for (let slotStart = new Date(dayStart); slotStart < dayEnd; slotStart = new Date(slotStart.getTime() + durationMin * 60 * 1000)) {
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60 * 1000);
      if (slotStart < windowStart || slotEnd > dayEnd) continue;
      const overlaps = busyRanges.some((range) => slotStart.getTime() < range.end && slotEnd.getTime() > range.start);
      if (!overlaps) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString(), assignedAgentId: query.assignedAgentId ?? null });
      }
    }
  }

  res.json({ slots: slots.slice(0, 120), timezone: settings.timezone ?? "UTC", durationMin });
});

appointmentRouter.get("/", requireAuth, async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional()
  });
  const queryInput = schema.parse(req.query);

  const query: Record<string, any> = { companyId };
  if (req.user?.role === "agent") {
    query.assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);
  }
  if (queryInput.status) query.status = queryInput.status;
  if (queryInput.from || queryInput.to) {
    query.scheduledFor = {
      ...(queryInput.from ? { $gte: new Date(queryInput.from) } : {}),
      ...(queryInput.to ? { $lte: new Date(queryInput.to) } : {})
    };
  }

  const appointments = await Appointment.find(query)
    .populate("assignedAgentId", "name email")
    .populate("leadId", "nombre telefono interes")
    .sort({ scheduledFor: 1 })
    .limit(300);
  res.json({ appointments });
});

appointmentRouter.post("/", requireAuth, requireRole(["company_admin", "admin", "agent"]), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    title: z.string().min(2),
    scheduledFor: z.string().datetime(),
    endAt: z.string().datetime().optional(),
    assignedAgentId: z.string().optional(),
    leadId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    notes: z.string().optional(),
    channel: z.enum(["whatsapp", "instagram", "messenger", "webchat", "manual"]).optional(),
    timezone: z.string().optional()
  });
  const body = schema.parse(req.body);
  const company = await Company.findById(companyId).select("appointmentSettings");
  const durationMin = (company as any)?.appointmentSettings?.slotDurationMin ?? 30;
  const scheduledFor = new Date(body.scheduledFor);
  const endAt = body.endAt ? new Date(body.endAt) : new Date(scheduledFor.getTime() + durationMin * 60 * 1000);

  let lead = null;
  if (body.leadId && mongoose.isValidObjectId(body.leadId)) {
    lead = await Lead.findOne({ _id: body.leadId, companyId });
  }

  let assignedAgentId: mongoose.Types.ObjectId | null = null;
  if (req.user?.role === "agent") {
    assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);
  } else if (body.assignedAgentId && mongoose.isValidObjectId(body.assignedAgentId)) {
    assignedAgentId = new mongoose.Types.ObjectId(body.assignedAgentId);
  }

  if (assignedAgentId) {
    const agentExists = await User.findOne({ _id: assignedAgentId, companyId, role: "agent" });
    if (!agentExists) return res.status(400).json({ error: "Assigned agent not found" });
  }

  const appointment = await Appointment.create({
    companyId,
    leadId: lead?._id ?? null,
    assignedAgentId,
    createdByUserId: req.user?.userId && mongoose.isValidObjectId(req.user.userId) ? new mongoose.Types.ObjectId(req.user.userId) : null,
    title: body.title,
    customerName: body.customerName ?? lead?.nombre ?? "",
    customerPhone: body.customerPhone ?? lead?.telefono ?? "",
    notes: body.notes ?? "",
    channel: body.channel ?? "manual",
    timezone: body.timezone ?? (company as any)?.appointmentSettings?.timezone ?? "UTC",
    scheduledFor,
    endAt,
    source: lead ? "lead" : "manual"
  });

  if (lead) {
    await Lead.findByIdAndUpdate(lead._id, {
      $set: {
        estado: "contactado",
        nextFollowUpAt: scheduledFor,
        followUpStatus: "pending",
        lastContactedAt: new Date()
      }
    });
  }

  res.status(201).json({ appointment });
});

appointmentRouter.patch("/:id", requireAuth, requireRole(["company_admin", "admin", "agent"]), async (req, res) => {
  const companyId = req.companyId!;
  const schema = z.object({
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
    scheduledFor: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    notes: z.string().optional()
  });
  const body = schema.parse(req.body);
  const query: Record<string, unknown> = { _id: req.params.id, companyId };
  if (req.user?.role === "agent") query.assignedAgentId = new mongoose.Types.ObjectId(req.user.userId);

  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.scheduledFor) update.scheduledFor = new Date(body.scheduledFor);
  if (body.endAt) update.endAt = new Date(body.endAt);
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.status === "cancelled") update.cancelledAt = new Date();
  if (body.status === "completed") update.completedAt = new Date();
  if (body.status === "confirmed") update.confirmationSentAt = new Date();

  const appointment = await Appointment.findOneAndUpdate(query, { $set: update }, { new: true });
  if (!appointment) return res.status(404).json({ error: "Not found" });
  res.json({ appointment });
});
