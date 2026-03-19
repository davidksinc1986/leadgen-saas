import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Campaign } from "../models/Campaign.js";
import { Lead } from "../models/Lead.js";
import { Appointment } from "../models/Appointment.js";
import { Conversation } from "../models/Conversation.js";

export const analyticsRouter = Router();

analyticsRouter.get("/sales-marketing", requireAuth, async (req, res) => {
  const companyId = req.companyId!;

  const [statusBreakdown, sourceBreakdown, leads, campaigns, appointments, conversations] = await Promise.all([
    Lead.aggregate([
      { $match: { companyId } },
      { $group: { _id: "$estado", count: { $sum: 1 } } }
    ]),
    Lead.aggregate([
      { $match: { companyId } },
      { $group: { _id: { $ifNull: ["$source", "Sin fuente"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Lead.find({ companyId }).select("estado source createdAt assignedAgentId qualifiedAt nextFollowUpAt followUpStatus").sort({ createdAt: -1 }).limit(2000),
    Campaign.find({ companyId }).sort({ createdAt: -1 }).limit(200),
    Appointment.find({ companyId }).select("status scheduledFor assignedAgentId").sort({ scheduledFor: -1 }).limit(2000),
    Conversation.find({ companyId }).select("step updatedAt").sort({ updatedAt: -1 }).limit(2000)
  ]);

  const totals = {
    totalLeads: leads.length,
    nuevos: leads.filter((l) => l.estado === "nuevo").length,
    contactados: leads.filter((l) => l.estado === "contactado").length,
    cerrados: leads.filter((l) => l.estado === "cerrado").length
  };

  const appointmentsSummary = {
    total: appointments.length,
    scheduled: appointments.filter((item) => item.status === "scheduled").length,
    confirmed: appointments.filter((item) => item.status === "confirmed").length,
    completed: appointments.filter((item) => item.status === "completed").length,
    cancelled: appointments.filter((item) => item.status === "cancelled").length,
    noShow: appointments.filter((item) => item.status === "no_show").length
  };

  const qualifiedLeads = leads.filter((lead) => !!lead.qualifiedAt).length;
  const conversionRate = totals.totalLeads ? Number(((totals.cerrados / totals.totalLeads) * 100).toFixed(2)) : 0;
  const bookingRate = qualifiedLeads ? Number((((appointmentsSummary.completed + appointmentsSummary.confirmed + appointmentsSummary.scheduled) / qualifiedLeads) * 100).toFixed(2)) : 0;
  const noShowRate = appointmentsSummary.total ? Number(((appointmentsSummary.noShow / appointmentsSummary.total) * 100).toFixed(2)) : 0;

  const trendMap = new Map<string, { date: string; leads: number; closed: number; appointments: number }>();
  leads.forEach((lead) => {
    const date = new Date(lead.createdAt).toISOString().split("T")[0];
    const row = trendMap.get(date) ?? { date, leads: 0, closed: 0, appointments: 0 };
    row.leads += 1;
    if (lead.estado === "cerrado") row.closed += 1;
    trendMap.set(date, row);
  });
  appointments.forEach((appointment) => {
    const date = new Date(appointment.scheduledFor).toISOString().split("T")[0];
    const row = trendMap.get(date) ?? { date, leads: 0, closed: 0, appointments: 0 };
    row.appointments += 1;
    trendMap.set(date, row);
  });

  const dailyTrend = Array.from(trendMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const campaignPerformance = campaigns.map((campaign) => {
    const campaignLeads = leads.filter((lead) => lead.source === campaign.sourceTag);
    const closedDeals = campaignLeads.filter((lead) => lead.estado === "cerrado").length;
    const leadCount = campaignLeads.length;
    const spent = campaign.spent || 0;

    return {
      _id: campaign._id,
      name: campaign.name,
      channel: campaign.channel,
      sourceTag: campaign.sourceTag,
      status: campaign.status,
      spent,
      budget: campaign.budget || 0,
      clicks: campaign.clicks || 0,
      impressions: campaign.impressions || 0,
      leads: leadCount,
      closedDeals,
      ctr: campaign.impressions ? Number((((campaign.clicks || 0) / campaign.impressions) * 100).toFixed(2)) : 0,
      cpl: leadCount ? Number((spent / leadCount).toFixed(2)) : 0,
      roi: spent ? Number((((closedDeals * 1000 - spent) / spent) * 100).toFixed(2)) : 0
    };
  });

  const byAgentMap = new Map<string, { agentId: string; leads: number; contacted: number; appointments: number; completedAppointments: number }>();
  leads.forEach((lead) => {
    const agentId = lead.assignedAgentId ? String(lead.assignedAgentId) : "unassigned";
    const current = byAgentMap.get(agentId) ?? { agentId, leads: 0, contacted: 0, appointments: 0, completedAppointments: 0 };
    current.leads += 1;
    if (lead.estado === "contactado" || lead.estado === "cerrado") current.contacted += 1;
    byAgentMap.set(agentId, current);
  });
  appointments.forEach((appointment) => {
    const agentId = appointment.assignedAgentId ? String(appointment.assignedAgentId) : "unassigned";
    const current = byAgentMap.get(agentId) ?? { agentId, leads: 0, contacted: 0, appointments: 0, completedAppointments: 0 };
    current.appointments += 1;
    if (appointment.status === "completed") current.completedAppointments += 1;
    byAgentMap.set(agentId, current);
  });

  const flowBreakdown = Array.from(
    conversations.reduce((map, conversation) => {
      const step = conversation.step || "idle";
      if (step === "idle") return map;
      map.set(step, (map.get(step) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries()
  ).map(([step, count]) => ({ step, count }));

  const overdueFollowUps = leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now() && lead.followUpStatus !== "done").length;

  res.json({
    kpis: {
      ...totals,
      conversionRate,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      marketingSpend: Number(campaigns.reduce((acc, c) => acc + (c.spent || 0), 0).toFixed(2)),
      bookingRate,
      noShowRate,
      appointmentsToday: appointments.filter((item) => new Date(item.scheduledFor).toDateString() === new Date().toDateString()).length,
      overdueFollowUps
    },
    statusBreakdown: statusBreakdown.map((item) => ({ estado: item._id, count: item.count })),
    sourceBreakdown: sourceBreakdown.map((item) => ({ source: item._id, count: item.count })),
    dailyTrend,
    campaignPerformance,
    appointmentsSummary,
    byAgent: Array.from(byAgentMap.values()),
    flowBreakdown
  });
});
