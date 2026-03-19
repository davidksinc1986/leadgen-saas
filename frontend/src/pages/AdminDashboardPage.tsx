import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

type Lead = {
  _id: string;
  nombre: string;
  telefono: string;
  interes: string;
  estado: "nuevo" | "contactado" | "cerrado";
  nextFollowUpAt?: string | null;
  priority?: "low" | "medium" | "high";
};

type Appointment = {
  _id: string;
  title: string;
  customerName?: string;
  scheduledFor: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  assignedAgentId?: { name?: string; email?: string } | null;
};

type AgentMetric = {
  agentId: string;
  leads: number;
  contacted: number;
  appointments: number;
  completedAppointments: number;
};

type DashboardAnalytics = {
  kpis: {
    totalLeads: number;
    conversionRate: number;
    bookingRate: number;
    noShowRate: number;
    appointmentsToday: number;
    overdueFollowUps: number;
  };
  byAgent: AgentMetric[];
  flowBreakdown: Array<{ step: string; count: number }>;
};

type Agent = {
  _id: string;
  name?: string;
  email: string;
};

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const { logout, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const requests = [
        api.get("/analytics/sales-marketing"),
        api.get("/leads"),
        api.get("/appointments", { params: { from: new Date().toISOString() } }),
        api.get("/appointments/slots", { params: { days: 3 } })
      ];
      if (role === "company_admin") requests.push(api.get("/agents"));

      const [analyticsResp, leadsResp, appointmentsResp, slotsResp, agentsResp] = await Promise.all(requests);
      setAnalytics(analyticsResp.data ?? null);
      setLeads(leadsResp.data?.leads ?? []);
      setAppointments(appointmentsResp.data?.appointments ?? []);
      setSlots(slotsResp.data?.slots ?? []);
      setAgents(agentsResp?.data?.agents ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo cargar el dashboard operativo");
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: Appointment["status"]) {
    await api.patch(`/appointments/${id}`, { status });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  const dueFollowUps = useMemo(
    () => leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now() && lead.estado !== "cerrado").slice(0, 8),
    [leads]
  );

  const todaysAppointments = useMemo(
    () => appointments.filter((appointment) => new Date(appointment.scheduledFor).toDateString() === new Date().toDateString()).slice(0, 8),
    [appointments]
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Company Operations Dashboard</h2>
          <p className="page-subtitle">Control operativo de leads, citas, agentes y seguimiento desde una sola vista.</p>
        </div>
        <div className="actions-row">
          <LanguageSwitcher />
          <button onClick={() => nav("/leads")}>Leads Workspace</button>
          <button onClick={() => nav("/intelligence")}>Revenue Intelligence</button>
          <button onClick={() => nav("/botflow")}>Bot Flow Studio</button>
          <button onClick={load} disabled={loading}>Refresh</button>
          <button className="btn-danger" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="surface kpi-card"><div className="kpi-label">Leads</div><div className="kpi-value">{analytics?.kpis.totalLeads ?? 0}</div></div>
        <div className="surface kpi-card"><div className="kpi-label">Conversión</div><div className="kpi-value">{analytics?.kpis.conversionRate ?? 0}%</div></div>
        <div className="surface kpi-card"><div className="kpi-label">Booking rate</div><div className="kpi-value">{analytics?.kpis.bookingRate ?? 0}%</div></div>
        <div className="surface kpi-card"><div className="kpi-label">Citas hoy</div><div className="kpi-value">{analytics?.kpis.appointmentsToday ?? 0}</div></div>
        <div className="surface kpi-card"><div className="kpi-label">Follow-ups vencidos</div><div className="kpi-value">{analytics?.kpis.overdueFollowUps ?? 0}</div></div>
        <div className="surface kpi-card"><div className="kpi-label">No-show rate</div><div className="kpi-value">{analytics?.kpis.noShowRate ?? 0}%</div></div>
      </div>

      <div className="panel-grid" style={{ alignItems: "start" }}>
        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Citas de hoy</h3>
          <p className="page-subtitle">Confirma, marca completadas o detecta no-show desde el panel central.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {todaysAppointments.map((appointment) => (
              <div key={appointment._id} className="surface panel">
                <div className="actions-row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <b>{appointment.title}</b>
                    <div className="page-subtitle">{appointment.customerName || "Lead sin nombre"} · {new Date(appointment.scheduledFor).toLocaleString()}</div>
                    <div className="page-subtitle">Agente: {appointment.assignedAgentId?.name || appointment.assignedAgentId?.email || "Sin asignar"}</div>
                  </div>
                  <span className="badge-pill">{appointment.status}</span>
                </div>
                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button onClick={() => updateAppointmentStatus(appointment._id, "confirmed")}>Confirmar</button>
                  <button onClick={() => updateAppointmentStatus(appointment._id, "completed")}>Completar</button>
                  <button onClick={() => updateAppointmentStatus(appointment._id, "no_show")}>No-show</button>
                </div>
              </div>
            ))}
            {!todaysAppointments.length && <div className="page-subtitle">No hay citas para hoy.</div>}
          </div>
        </section>

        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Follow-ups pendientes</h3>
          <p className="page-subtitle">Leads fríos o vencidos que requieren acción humana hoy.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {dueFollowUps.map((lead) => (
              <div key={lead._id} className="surface panel">
                <b>{lead.nombre || lead.telefono}</b>
                <div className="page-subtitle">Interés: {lead.interes || "Sin definir"}</div>
                <div className="page-subtitle">Vencido desde: {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : "-"}</div>
                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button onClick={() => nav("/leads")}>Abrir lead</button>
                </div>
              </div>
            ))}
            {!dueFollowUps.length && <div className="page-subtitle">No hay follow-ups vencidos por ahora.</div>}
          </div>
        </section>
      </div>

      <div className="panel-grid" style={{ alignItems: "start", marginTop: 16 }}>
        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Performance por agente</h3>
          <div className="data-table-wrap">
            <table className="data-table" cellPadding={10}>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Leads</th>
                  <th>Contactados</th>
                  <th>Citas</th>
                  <th>Citas completadas</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.byAgent ?? []).map((row) => {
                  const agent = agents.find((item) => item._id === row.agentId);
                  return (
                    <tr key={row.agentId}>
                      <td>{agent?.name || agent?.email || row.agentId}</td>
                      <td>{row.leads}</td>
                      <td>{row.contacted}</td>
                      <td>{row.appointments}</td>
                      <td>{row.completedAppointments}</td>
                    </tr>
                  );
                })}
                {!(analytics?.byAgent?.length) && (
                  <tr><td colSpan={5}>Sin datos por agente todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Próximos slots disponibles</h3>
          <p className="page-subtitle">Base operativa para confirmar citas sin salir del workspace.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {slots.slice(0, 10).map((slot) => (
              <div key={slot.start} className="surface panel">
                <b>{new Date(slot.start).toLocaleString()}</b>
                <div className="page-subtitle">Hasta {new Date(slot.end).toLocaleTimeString()}</div>
              </div>
            ))}
            {!slots.length && <div className="page-subtitle">No hay slots disponibles en la ventana consultada.</div>}
          </div>
        </section>
      </div>

      <section className="surface panel animated-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Abandono / pasos activos del flow</h3>
        <p className="page-subtitle">Vista rápida de en qué paso quedan conversaciones activas para atacar fricción.</p>
        <div className="actions-row" style={{ flexWrap: "wrap" }}>
          {(analytics?.flowBreakdown ?? []).map((item) => (
            <span key={item.step} className="badge-pill">{item.step}: {item.count}</span>
          ))}
          {!(analytics?.flowBreakdown?.length) && <span className="page-subtitle">No hay conversaciones activas fuera de idle.</span>}
        </div>
      </section>
    </div>
  );
}
