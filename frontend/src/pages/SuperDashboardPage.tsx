import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

type TabKey = "overview" | "users" | "companies" | "branding" | "calendar" | "wizard";

type SuperUser = {
  _id: string;
  email: string;
  role: "super_admin" | "company_admin" | "admin" | "agent";
  name?: string;
  isActive: boolean;
  companyId?: { _id?: string; name?: string; slug?: string };
};

type Company = {
  _id: string;
  name: string;
  slug: string;
  limits?: { maxCompanyAdmins?: number; maxAgents?: number };
  branding?: {
    logoUrl?: string;
    appTitle?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    neutralColor?: string;
    themePreset?: string;
  };
  calendarSync?: {
    enabled?: boolean;
    provider?: "none" | "google" | "outlook" | "apple";
    calendarEmail?: string;
    syncMode?: "two_way" | "read_only" | "write_only";
    timezone?: string;
    lastSyncAt?: string;
  };
};

const TAB_LIST: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "companies", label: "Companies" },
  { key: "branding", label: "Branding" },
  { key: "calendar", label: "Calendar Sync" },
  { key: "wizard", label: "Setup Wizard" }
];

export default function SuperDashboardPage() {
  const { logout } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState<TabKey>("overview");
  const [users, setUsers] = useState<SuperUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [overview, setOverview] = useState({ users: 0, companies: 0, superUsers: 0, companyAdmins: 0, agents: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({ email: "", password: "", role: "company_admin", name: "", companyId: "" });
  const [newCompany, setNewCompany] = useState({ name: "", slug: "" });

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const selectedCompany = useMemo(() => companies.find((c) => c._id === selectedCompanyId) ?? companies[0], [companies, selectedCompanyId]);

  const [brandingForm, setBrandingForm] = useState({
    logoUrl: "",
    appTitle: "",
    primaryColor: "#2563eb",
    secondaryColor: "#0ea5e9",
    accentColor: "#db2777",
    neutralColor: "#0f172a",
    themePreset: "modern-blue"
  });

  const [calendarForm, setCalendarForm] = useState({
    enabled: false,
    provider: "none",
    calendarEmail: "",
    syncMode: "two_way",
    timezone: "UTC"
  });

  async function loadAll() {
    setBusy(true);
    setError(null);
    try {
      const [ov, us, co] = await Promise.all([api.get("/super/overview"), api.get("/super/users"), api.get("/super/companies")]);
      setOverview(ov.data ?? overview);
      setUsers(us.data?.users ?? []);
      const nextCompanies = co.data?.companies ?? [];
      setCompanies(nextCompanies);
      if (nextCompanies.length > 0) {
        const defaultId = selectedCompanyId || nextCompanies[0]._id;
        setSelectedCompanyId(defaultId);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? "No se pudo cargar el panel super user");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    setBrandingForm({
      logoUrl: selectedCompany.branding?.logoUrl ?? "",
      appTitle: selectedCompany.branding?.appTitle ?? "",
      primaryColor: selectedCompany.branding?.primaryColor ?? "#2563eb",
      secondaryColor: selectedCompany.branding?.secondaryColor ?? "#0ea5e9",
      accentColor: selectedCompany.branding?.accentColor ?? "#db2777",
      neutralColor: selectedCompany.branding?.neutralColor ?? "#0f172a",
      themePreset: selectedCompany.branding?.themePreset ?? "modern-blue"
    });
    setCalendarForm({
      enabled: selectedCompany.calendarSync?.enabled ?? false,
      provider: selectedCompany.calendarSync?.provider ?? "none",
      calendarEmail: selectedCompany.calendarSync?.calendarEmail ?? "",
      syncMode: selectedCompany.calendarSync?.syncMode ?? "two_way",
      timezone: selectedCompany.calendarSync?.timezone ?? "UTC"
    });
  }, [selectedCompanyId, selectedCompany?._id, companies.length]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/super/users", {
      ...newUser,
      companyId: newUser.role === "super_admin" ? undefined : newUser.companyId
    });
    setNewUser({ email: "", password: "", role: "company_admin", name: "", companyId: "" });
    await loadAll();
  }

  async function toggleUser(user: SuperUser) {
    await api.patch(`/super/users/${user._id}`, { isActive: !user.isActive });
    await loadAll();
  }

  async function removeUser(user: SuperUser) {
    if (!confirm(`Delete ${user.email}?`)) return;
    await api.delete(`/super/users/${user._id}`);
    await loadAll();
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/super/companies", newCompany);
    setNewCompany({ name: "", slug: "" });
    await loadAll();
  }

  async function updateCompany(company: Company) {
    const name = prompt("Nuevo nombre", company.name);
    if (!name) return;
    const slug = prompt("Nuevo slug", company.slug);
    if (!slug) return;
    await api.patch(`/super/companies/${company._id}`, { name, slug });
    await loadAll();
  }

  async function updateLimits(company: Company) {
    const maxCompanyAdmins = Number(prompt("Max company admins", String(company.limits?.maxCompanyAdmins ?? 3)));
    const maxAgents = Number(prompt("Max agents", String(company.limits?.maxAgents ?? 20)));
    await api.patch(`/super/companies/${company._id}/limits`, { maxCompanyAdmins, maxAgents });
    await loadAll();
  }

  async function removeCompany(company: Company) {
    if (!confirm(`Delete company ${company.name}? This also removes non protected users.`)) return;
    await api.delete(`/super/companies/${company._id}`);
    await loadAll();
  }

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany) return;
    await api.patch(`/super/companies/${selectedCompany._id}/branding`, brandingForm);
    await loadAll();
  }

  async function saveCalendar(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany) return;
    await api.patch(`/super/companies/${selectedCompany._id}/calendar`, calendarForm);
    await loadAll();
  }

  return (
    <div className="page super-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Super User Command Center</h2>
          <p className="page-subtitle">Control total por tabs: usuarios, compañías, branding, agenda y configuración guiada.</p>
        </div>
        <div className="actions-row">
          <button onClick={loadAll} disabled={busy}>Refresh</button>
          <button onClick={() => nav("/login")}>Open Admin Workspace</button>
          <button className="btn-danger" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="super-tabs">
        {TAB_LIST.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="card-grid" style={{ marginBottom: 16 }}>
            <div className="surface kpi-card animated-card"><div className="kpi-label">Super users</div><div className="kpi-value">{overview.superUsers}</div></div>
            <div className="surface kpi-card animated-card"><div className="kpi-label">Company admins</div><div className="kpi-value">{overview.companyAdmins}</div></div>
            <div className="surface kpi-card animated-card"><div className="kpi-label">Agents</div><div className="kpi-value">{overview.agents}</div></div>
            <div className="surface kpi-card animated-card"><div className="kpi-label">Companies</div><div className="kpi-value">{overview.companies}</div></div>
          </div>
          <div className="surface panel">
            <h3 style={{ marginTop: 0 }}>Enterprise dashboard checklist</h3>
            <ul>
              <li>Pipeline por fuente (Meta, Google, TikTok, orgánico) y por etapa.</li>
              <li>SLA de primer contacto, tasa de agendamiento y tasa de cierre por agente.</li>
              <li>Forecast de citas por semana y alertas de no-show.</li>
              <li>Benchmarks entre companies para detectar oportunidades de coaching.</li>
            </ul>
          </div>
        </>
      )}

      {tab === "users" && (
        <div className="panel-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
          <form className="surface panel" onSubmit={createUser}>
            <h3 style={{ marginTop: 0 }}>Create user</h3>
            <p className="page-subtitle">Wizard rápido: define rol, credenciales y compañía.</p>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              <input placeholder="Password (min 8)" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as SuperUser["role"] })}>
                <option value="super_admin">super_admin</option>
                <option value="company_admin">company_admin</option>
                <option value="admin">admin</option>
                <option value="agent">agent</option>
              </select>
              {newUser.role !== "super_admin" && (
                <select value={newUser.companyId} onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })} required>
                  <option value="">Select company</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ marginTop: 10 }}><button className="btn-primary">Add user</button></div>
          </form>

          <div className="data-table-wrap">
            <table className="data-table" cellPadding={10}>
              <thead><tr><th>Email</th><th>Role</th><th>Company</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.email}</td><td>{u.role}</td><td>{u.companyId?.name ?? "Platform"}</td><td>{u.isActive ? "Active" : "Blocked"}</td>
                    <td className="actions-row">
                      <button onClick={() => toggleUser(u)}>{u.isActive ? "Block" : "Unblock"}</button>
                      <button className="btn-danger" onClick={() => removeUser(u)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "companies" && (
        <div className="panel-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
          <form className="surface panel" onSubmit={createCompany}>
            <h3 style={{ marginTop: 0 }}>Create company</h3>
            <p className="page-subtitle">Cada tenant se crea con límites iniciales y branding editable.</p>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <input placeholder="Company name" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} required />
              <input placeholder="slug (kebab-case)" value={newCompany.slug} onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value.toLowerCase() })} required />
            </div>
            <div style={{ marginTop: 10 }}><button className="btn-primary">Create company</button></div>
          </form>

          <div className="data-table-wrap">
            <table className="data-table" cellPadding={10}>
              <thead><tr><th>Company</th><th>Slug</th><th>Limits</th><th>Actions</th></tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td className="mono">{c.slug}</td>
                    <td>Admins: {c.limits?.maxCompanyAdmins ?? 3} · Agents: {c.limits?.maxAgents ?? 20}</td>
                    <td className="actions-row">
                      <button onClick={() => updateCompany(c)}>Edit</button>
                      <button onClick={() => updateLimits(c)}>Limits</button>
                      <button className="btn-danger" onClick={() => removeCompany(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "branding" && (
        <form className="surface panel" onSubmit={saveBranding}>
          <h3 style={{ marginTop: 0 }}>Branding & visual identity</h3>
          <p className="page-subtitle">Logo, nombre comercial y paletas modernas por company.</p>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(3,minmax(180px,1fr))" }}>
            <select value={selectedCompany?._id ?? ""} onChange={(e) => setSelectedCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <input placeholder="App title" value={brandingForm.appTitle} onChange={(e) => setBrandingForm({ ...brandingForm, appTitle: e.target.value })} />
            <input placeholder="Logo URL" value={brandingForm.logoUrl} onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })} />
            <label>Primary <input type="color" value={brandingForm.primaryColor} onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} /></label>
            <label>Secondary <input type="color" value={brandingForm.secondaryColor} onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })} /></label>
            <label>Accent <input type="color" value={brandingForm.accentColor} onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })} /></label>
            <label>Neutral <input type="color" value={brandingForm.neutralColor} onChange={(e) => setBrandingForm({ ...brandingForm, neutralColor: e.target.value })} /></label>
            <input placeholder="Theme preset" value={brandingForm.themePreset} onChange={(e) => setBrandingForm({ ...brandingForm, themePreset: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}><button className="btn-primary">Save branding</button></div>
        </form>
      )}

      {tab === "calendar" && (
        <form className="surface panel" onSubmit={saveCalendar}>
          <h3 style={{ marginTop: 0 }}>Scheduling & calendar sync</h3>
          <p className="page-subtitle">Conecta Google (Gmail), Outlook (Hotmail) o Apple Calendar para sincronización de citas.</p>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(3,minmax(180px,1fr))" }}>
            <select value={selectedCompany?._id ?? ""} onChange={(e) => setSelectedCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={String(calendarForm.enabled)} onChange={(e) => setCalendarForm({ ...calendarForm, enabled: e.target.value === "true" })}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <select value={calendarForm.provider} onChange={(e) => setCalendarForm({ ...calendarForm, provider: e.target.value as "none" | "google" | "outlook" | "apple" })}>
              <option value="none">No provider</option>
              <option value="google">Google / Gmail</option>
              <option value="outlook">Outlook / Hotmail</option>
              <option value="apple">Apple Calendar</option>
            </select>
            <input placeholder="calendar@company.com" value={calendarForm.calendarEmail} onChange={(e) => setCalendarForm({ ...calendarForm, calendarEmail: e.target.value })} />
            <select value={calendarForm.syncMode} onChange={(e) => setCalendarForm({ ...calendarForm, syncMode: e.target.value as "two_way" | "read_only" | "write_only" })}>
              <option value="two_way">Two-way sync</option>
              <option value="read_only">Read-only</option>
              <option value="write_only">Write-only</option>
            </select>
            <input placeholder="Timezone (America/New_York)" value={calendarForm.timezone} onChange={(e) => setCalendarForm({ ...calendarForm, timezone: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}><button className="btn-primary">Save calendar settings</button></div>
        </form>
      )}

      {tab === "wizard" && (
        <div className="surface panel wizard-panel">
          <h3 style={{ marginTop: 0 }}>Guided setup wizard (admin + agents)</h3>
          <ol>
            <li><b>Company onboarding:</b> crea tenant, logo, paleta y canales de captación.</li>
            <li><b>People setup:</b> crea admin principal, agentes y reglas de roles.</li>
            <li><b>Calendar setup:</b> habilita proveedor principal (Gmail/Outlook/Apple) y modo de sync.</li>
            <li><b>Lead pipeline:</b> personaliza etapas, mensajes y SLAs por tipo de lead.</li>
            <li><b>Quality checks:</b> habilita ejemplos de formularios y validaciones para evitar leads incompletos.</li>
          </ol>
          <p className="page-subtitle">Tip: cada paso puede delegarse por tab para que un admin no técnico configure sin fricción.</p>
        </div>
      )}
    </div>
  );
}
