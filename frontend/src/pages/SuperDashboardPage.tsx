import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

type SuperUser = {
  _id: string;
  email: string;
  role: string;
  isActive: boolean;
  companyId?: { name?: string; slug?: string };
};

export default function SuperDashboardPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<SuperUser[]>([]);

  async function load() {
    const resp = await api.get("/super/users");
    setUsers(resp.data?.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const superUsers = users.filter((u) => u.role === "super_admin").length;
  const companyAdmins = users.filter((u) => ["company_admin", "admin"].includes(u.role)).length;
  const agents = users.filter((u) => u.role === "agent").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Super User Command Center</h2>
          <p className="page-subtitle">Executive overview for platform governance, account health, and tenant operations.</p>
        </div>
        <div className="actions-row">
          <button onClick={load}>Refresh</button>
          <button onClick={() => nav("/admin")}>Open Admin Workspace</button>
          <button className="btn-danger" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="surface kpi-card animated-card"><div className="kpi-label">Super users</div><div className="kpi-value">{superUsers}</div></div>
        <div className="surface kpi-card animated-card"><div className="kpi-label">Company admins</div><div className="kpi-value">{companyAdmins}</div></div>
        <div className="surface kpi-card animated-card"><div className="kpi-label">Agents</div><div className="kpi-value">{agents}</div></div>
        <div className="surface kpi-card animated-card"><div className="kpi-label">Total users</div><div className="kpi-value">{users.length}</div></div>
      </div>

      <div className="surface panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Social channel setup playbook</h3>
        <p className="page-subtitle">Follow this checklist to reduce support tickets and ensure smooth onboarding for salons and nail artists.</p>
        <ul>
          <li><b>Instagram:</b> Connect a Business account, enable messaging, and add booking CTA in bio. Example handle: @glowbar.nails</li>
          <li><b>Facebook:</b> Link a verified page, configure Messenger greeting, and sync service catalog with prices.</li>
          <li><b>WhatsApp Business:</b> Verify number, set business profile hours, and preconfigure quick replies for appointment intake.</li>
          <li><b>TikTok:</b> Add profile link to booking form and include campaign UTM source tags for attribution.</li>
        </ul>
      </div>

      <div className="data-table-wrap">
        <table className="data-table" cellPadding={10}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Company</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.companyId?.name ?? "Platform"}</td>
                <td>{u.isActive ? "Active" : "Blocked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
