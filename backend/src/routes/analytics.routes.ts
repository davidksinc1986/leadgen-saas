import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Campaign } from "../models/Campaign.js";
import { Lead } from "../models/Lead.js";

export const analyticsRouter = Router();

analyticsRouter.get("/sales-marketing", requireAuth, async (req, res) => {
  const companyId = req.companyId!;

  const [statusBreakdown, sourceBreakdown, leads, campaigns] = await Promise.all([
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
    Lead.find({ companyId }).select("estado source createdAt").sort({ createdAt: -1 }).limit(2000),
    Campaign.find({ companyId }).sort({ createdAt: -1 }).limit(200)
  ]);

  const totals = {
    totalLeads: leads.length,
    nuevos: leads.filter((l) => l.estado === "nuevo").length,
    contactados: leads.filter((l) => l.estado === "contactado").length,
    cerrados: leads.filter((l) => l.estado === "cerrado").length
  };

  const conversionRate = totals.totalLeads ? Number(((totals.cerrados / totals.totalLeads) * 100).toFixed(2)) : 0;

  const trendMap = new Map<string, { date: string; leads: number; closed: number }>();
  leads.forEach((lead) => {
    const date = new Date(lead.createdAt).toISOString().split("T")[0];
    const row = trendMap.get(date) ?? { date, leads: 0, closed: 0 };
    row.leads += 1;
    if (lead.estado === "cerrado") row.closed += 1;
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

  res.json({
    kpis: {
      ...totals,
      conversionRate,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      marketingSpend: Number(campaigns.reduce((acc, c) => acc + (c.spent || 0), 0).toFixed(2))
    },
    statusBreakdown: statusBreakdown.map((item) => ({ estado: item._id, count: item.count })),
    sourceBreakdown: sourceBreakdown.map((item) => ({ source: item._id, count: item.count })),
    dailyTrend,
    campaignPerformance
  });
});
