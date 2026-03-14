import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

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
  qualifiedAt?: string | null;
  assignedAgentId?: string | null;
  createdAt: string;
  customFields?: Record<string, any>;
};

export default function LeadsPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>();

  const grouped = useMemo(
    () => ({
      nuevo: leads.filter((l) => l.estado === "nuevo"),
      contactado: leads.filter((l) => l.estado === "contactado"),
      cerrado: leads.filter((l) => l.estado === "cerrado")
    }),
    [leads]
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

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Leads Pipeline</h2>
          <p className="page-subtitle">Administra estado y seguimiento de tus oportunidades en tiempo real.</p>
        </div>
        <div className="actions-row">
          <button onClick={() => nav("/botflow")}>BotFlow</button>
          <button onClick={() => nav("/intelligence")}>Inteligencia</button>
          <button onClick={load} disabled={loading}>Refrescar</button>
          <button className="btn-danger" onClick={logout}>Salir</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="surface kpi-card">
          <div className="kpi-label">Nuevos</div>
          <div className="kpi-value">{grouped.nuevo.length}</div>
        </div>
        <div className="surface kpi-card">
          <div className="kpi-label">Contactados</div>
          <div className="kpi-value">{grouped.contactado.length}</div>
        </div>
        <div className="surface kpi-card">
          <div className="kpi-label">Cerrados</div>
          <div className="kpi-value">{grouped.cerrado.length}</div>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table" cellPadding={10}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Interés</th>
              <th>Presupuesto</th>
              <th>Ubicación</th>
              <th>Tiempo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id}>
                <td>{l.nombre || "-"}</td>
                <td>{l.telefono}</td>
                <td>{l.interes || "-"}</td>
                <td>{l.presupuesto || "-"}</td>
                <td>{l.ubicacion || "-"}</td>
                <td>{l.tiempoCompra || "-"}</td>
                <td><b>{l.estado}</b></td>
                <td>
                  <div className="actions-row">
                    <button onClick={() => setStatus(l._id, "nuevo")}>nuevo</button>
                    <button onClick={() => setStatus(l._id, "contactado")}>contactado</button>
                    <button onClick={() => setStatus(l._id, "cerrado")}>cerrado</button>
                  </div>
                </td>
              </tr>
            ))}
            {!leads.length && !loading && (
              <tr>
                <td colSpan={8} style={{ color: "#64748b" }}>No hay leads.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
