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
  <div style={{ padding: 20, fontFamily: "system-ui" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2>Leads</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => nav("/botflow")}>BotFlow</button>
        <button onClick={load} disabled={loading}>
          Refrescar
        </button>
        <button onClick={logout}>Salir</button>
      </div>
    </div>

    {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
      <div>
        <b>Nuevos:</b> {grouped.nuevo.length}
      </div>
      <div>
        <b>Contactados:</b> {grouped.contactado.length}
      </div>
      <div>
        <b>Cerrados:</b> {grouped.cerrado.length}
      </div>
    </div>

    <table width="100%" cellPadding={10} style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
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
          <tr key={l._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <td>{l.nombre || "-"}</td>
            <td>{l.telefono}</td>
            <td>{l.interes || "-"}</td>
            <td>{l.presupuesto || "-"}</td>
            <td>{l.ubicacion || "-"}</td>
            <td>{l.tiempoCompra || "-"}</td>
            <td>
              <b>{l.estado}</b>
            </td>
            <td style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setStatus(l._id, "nuevo")}>nuevo</button>
              <button onClick={() => setStatus(l._id, "contactado")}>contactado</button>
              <button onClick={() => setStatus(l._id, "cerrado")}>cerrado</button>
            </td>
          </tr>
        ))}
        {!leads.length && !loading && (
          <tr>
            <td colSpan={8} style={{ color: "#666" }}>
              No hay leads.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
}