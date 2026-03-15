import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

type Lead = {
  _id: string;
  nombre: string;
  telefono: string;
  interes: string;
  presupuesto: string;
  ubicacion: string;
  tiempoCompra: string;
  estado: "nuevo" | "contactado" | "cerrado";
  source: string;
  leadScore?: number;
  priority?: "low" | "medium" | "high";
  nextFollowUpAt?: string | null;
  followUpStatus?: "pending" | "done" | "overdue";
  followUpNotes?: string;
  createdAt: string;
};

const statusOrder = ["nuevo", "contactado", "cerrado"] as const;

export default function LeadsPage() {
  const { logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOrder)[number] | "all">("all");
  const [onlyDue, setOnlyDue] = useState(false);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const byStatus = statusFilter === "all" || lead.estado === statusFilter;
      const text = `${lead.nombre} ${lead.telefono} ${lead.interes}`.toLowerCase();
      const bySearch = !search.trim() || text.includes(search.toLowerCase());
      const followDate = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).getTime() : null;
      const byDue = !onlyDue || (followDate !== null && followDate < Date.now() && lead.estado !== "cerrado");
      return byStatus && bySearch && byDue;
    });
  }, [leads, onlyDue, search, statusFilter]);

  const grouped = useMemo(
    () => ({
      nuevo: filteredLeads.filter((l) => l.estado === "nuevo"),
      contactado: filteredLeads.filter((l) => l.estado === "contactado"),
      cerrado: filteredLeads.filter((l) => l.estado === "cerrado"),
      due: filteredLeads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() < Date.now() && l.estado !== "cerrado")
    }),
    [filteredLeads]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get("/leads");
      setLeads(resp.data?.leads ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, estado: Lead["estado"]) {
    await api.patch(`/leads/${id}/status`, { estado });
    await load();
  }

  async function quickFollowUp(id: string, daysFromNow: number) {
    const next = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
    await api.patch(`/leads/${id}/workflow`, { nextFollowUpAt: next, followUpStatus: "pending", markContacted: true });
    await load();
  }

  async function setPriority(id: string, priority: "low" | "medium" | "high") {
    await api.patch(`/leads/${id}/workflow`, { priority });
    await load();
  }

  function getRecommendation(lead: Lead) {
    const score = lead.leadScore ?? 40;
    if (score >= 75) return t("leads.recommendation.hot");
    if (score >= 50) return t("leads.recommendation.warm");
    return t("leads.recommendation.cold");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("leads.title")}</h2>
          <p className="page-subtitle">Beauty pipeline for salons and manicurists with smart follow-up prioritization.</p>
        </div>
        <div className="actions-row">
          <LanguageSwitcher />
          <button onClick={() => nav("/botflow")}>{t("common.botFlow")}</button>
          <button onClick={() => nav("/intelligence")}>{t("common.intelligence")}</button>
          <button onClick={load} disabled={loading}>{t("common.refresh")}</button>
          <button className="btn-danger" onClick={logout}>{t("common.logout")}</button>
        </div>
      </div>

      <div className="surface panel" style={{ marginBottom: 14 }}>
        <div className="actions-row">
          <input
            style={{ minWidth: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("leads.searchPlaceholder")}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">All</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
            {t("leads.onlyDue")}
          </label>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}


      <div className="surface panel" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Lead form instructions (avoid incomplete contacts)</h3>
        <p className="page-subtitle">Ask for complete details using examples: Name ("Ana Lopez"), Service ("Gel manicure + design"), Budget ("$35-$50"), Preferred date ("Saturday 2 PM").</p>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="surface kpi-card">
          <div className="kpi-label">{t("leads.new")}</div>
          <div className="kpi-value">{grouped.nuevo.length}</div>
        </div>
        <div className="surface kpi-card">
          <div className="kpi-label">{t("leads.contacted")}</div>
          <div className="kpi-value">{grouped.contactado.length}</div>
        </div>
        <div className="surface kpi-card">
          <div className="kpi-label">{t("leads.closed")}</div>
          <div className="kpi-value">{grouped.cerrado.length}</div>
        </div>
        <div className="surface kpi-card">
          <div className="kpi-label">{t("leads.followupDue")}</div>
          <div className="kpi-value">{grouped.due.length}</div>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table" cellPadding={10}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Interés</th>
              <th>{t("leads.score")}</th>
              <th>{t("leads.priority")}</th>
              <th>{t("leads.followup")}</th>
              <th>{t("leads.nextAction")}</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((l) => (
              <tr key={l._id}>
                <td>{l.nombre || "-"}</td>
                <td>{l.telefono}</td>
                <td>{l.interes || "-"}</td>
                <td>{l.leadScore ?? 40}</td>
                <td>
                  <select value={l.priority ?? "medium"} onChange={(e) => setPriority(l._id, e.target.value as any)}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </td>
                <td>{l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleString() : "-"}</td>
                <td>{getRecommendation(l)}</td>
                <td><b>{l.estado}</b></td>
                <td>
                  <div className="actions-row">
                    <button onClick={() => setStatus(l._id, "nuevo")}>nuevo</button>
                    <button onClick={() => setStatus(l._id, "contactado")}>contactado</button>
                    <button onClick={() => setStatus(l._id, "cerrado")}>cerrado</button>
                    <button onClick={() => quickFollowUp(l._id, 1)}>+1d</button>
                    <button onClick={() => quickFollowUp(l._id, 3)}>+3d</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredLeads.length && !loading && (
              <tr>
                <td colSpan={9} style={{ color: "#64748b" }}>{t("leads.noLeads")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
