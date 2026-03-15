import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

type Kpis = {
  totalLeads: number;
  nuevos: number;
  contactados: number;
  cerrados: number;
  conversionRate: number;
  activeCampaigns: number;
  marketingSpend: number;
};

type Campaign = {
  _id: string;
  name: string;
  channel: string;
  sourceTag: string;
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cplGoal: number;
  cvrGoal: number;
  notes?: string;
  leads?: number;
  closedDeals?: number;
  cpl?: number;
  roi?: number;
};

type Analytics = {
  kpis: Kpis;
  sourceBreakdown: { source: string; count: number }[];
  dailyTrend: { date: string; leads: number; closed: number }[];
  campaignPerformance: Campaign[];
};

const emptyForm = {
  name: "",
  channel: "meta_ads",
  sourceTag: "",
  status: "draft",
  budget: 0,
  spent: 0,
  impressions: 0,
  clicks: 0,
  cplGoal: 0,
  cvrGoal: 0,
  notes: ""
};

export default function RevenueIntelPage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [analyticsResp, campaignsResp] = await Promise.all([
        api.get("/analytics/sales-marketing"),
        api.get("/campaigns")
      ]);
      setAnalytics(analyticsResp.data);
      setCampaigns(campaignsResp.data?.campaigns ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Unable to load business intelligence");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/campaigns", form);
      setForm(emptyForm);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Unable to create campaign");
    } finally {
      setSaving(false);
    }
  }

  async function setCampaignStatus(id: string, status: Campaign["status"]) {
    await api.patch(`/campaigns/${id}`, { status });
    await loadAll();
  }

  const topChannels = useMemo(() => analytics?.sourceBreakdown ?? [], [analytics]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sales & Marketing Intelligence</h2>
          <p className="page-subtitle">Executive view with channel attribution and campaign performance for beauty businesses.</p>
        </div>
        <div className="actions-row">
          <LanguageSwitcher />
          <button onClick={() => nav("/leads")}>{t("common.leads")}</button>
          <button onClick={loadAll}>{t("common.refresh")}</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {analytics && (
        <>
          <div className="card-grid" style={{ marginBottom: 18 }}>
            {[
              ["Total leads", analytics.kpis.totalLeads],
              ["New leads", analytics.kpis.nuevos],
              ["Contacted", analytics.kpis.contactados],
              ["Closed", analytics.kpis.cerrados],
              ["Conv. rate", `${analytics.kpis.conversionRate}%`],
              ["Active campaigns", analytics.kpis.activeCampaigns],
              ["Spend", `$${analytics.kpis.marketingSpend}`]
            ].map(([label, value]) => (
              <div key={label as string} className="surface kpi-card">
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{value}</div>
              </div>
            ))}
          </div>

          <div className="panel-grid" style={{ marginBottom: 22 }}>
            <div className="surface panel">
              <h4 style={{ marginTop: 0 }}>Top lead sources</h4>
              {topChannels.map((item) => (
                <div key={item.source} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{item.source || "No source"}</span>
                    <b>{item.count}</b>
                  </div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99 }}>
                    <div
                      style={{
                        width: `${Math.max((item.count / Math.max(analytics.kpis.totalLeads, 1)) * 100, 3)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #2563eb, #22d3ee)",
                        borderRadius: 99
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="surface panel">
              <h4 style={{ marginTop: 0 }}>Daily trend (30 days)</h4>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {analytics.dailyTrend.map((row) => (
                  <div key={row.date} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}>
                    <span>{row.date}</span>
                    <span>Leads: {row.leads}</span>
                    <span>Closed: {row.closed}</span>
                  </div>
                ))}
                {!analytics.dailyTrend.length && <div style={{ color: "#64748b" }}>No trend data yet.</div>}
              </div>
            </div>
          </div>
        </>
      )}



      <div className="surface panel" style={{ marginBottom: 22 }}>
        <h3 style={{ marginTop: 0 }}>Social network configuration guide</h3>
        <ul>
          <li><b>Instagram:</b> connect business profile, add booking link, and set campaign sourceTag like <code>ig_reels_spring</code>.</li>
          <li><b>Facebook:</b> verify page role access and include service menu with clear pricing examples.</li>
          <li><b>WhatsApp:</b> configure greeting and quick replies with intake examples (name, service, preferred date).</li>
          <li><b>TikTok:</b> add profile bio CTA and use unique sourceTag such as <code>tiktok_nail_art_launch</code>.</li>
        </ul>
      </div>

      <div className="surface panel" style={{ marginBottom: 22 }}>
        <h3 style={{ marginTop: 0 }}>Campaign Builder</h3>
        <p className="page-subtitle" style={{ marginBottom: 12 }}>Use examples in each field to avoid missing lead details and improve attribution accuracy.</p>
        <form onSubmit={createCampaign} className="form-grid">
          <input required placeholder="Example: Summer Glow Nails Promo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="organic">Organic</option>
            <option value="other">Other</option>
          </select>
          <input required placeholder="sourceTag" value={form.sourceTag} onChange={(e) => setForm({ ...form, sourceTag: e.target.value })} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Campaign["status"] })}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <input type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
          <input type="number" placeholder="Spent" value={form.spent} onChange={(e) => setForm({ ...form, spent: Number(e.target.value) })} />
          <input type="number" placeholder="Impressions" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: Number(e.target.value) })} />
          <input type="number" placeholder="Clicks" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: Number(e.target.value) })} />
          <input type="number" placeholder="Target CPL (example: 12)" value={form.cplGoal} onChange={(e) => setForm({ ...form, cplGoal: Number(e.target.value) })} />
          <input type="number" placeholder="Target CVR % (example: 15)" value={form.cvrGoal} onChange={(e) => setForm({ ...form, cvrGoal: Number(e.target.value) })} />
          <input style={{ gridColumn: "span 2" }} placeholder="Notes (example: include bridal manicure package upsell)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Create campaign"}</button>
        </form>
      </div>

      <h3>Campaign performance</h3>
      <div className="data-table-wrap">
        <table className="data-table" cellPadding={8}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Channel</th>
              <th>sourceTag</th>
              <th>Spend</th>
              <th>Leads</th>
              <th>Closed</th>
              <th>CPL</th>
              <th>ROI%</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(analytics?.campaignPerformance ?? campaigns).map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.channel}</td>
                <td>{c.sourceTag}</td>
                <td>${c.spent || 0}</td>
                <td>{c.leads ?? 0}</td>
                <td>{c.closedDeals ?? 0}</td>
                <td>${c.cpl ?? 0}</td>
                <td>{c.roi ?? 0}%</td>
                <td>
                  <select value={c.status} onChange={(e) => setCampaignStatus(c._id, e.target.value as Campaign["status"])}>
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
