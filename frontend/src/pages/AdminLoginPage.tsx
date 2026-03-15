import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email y password son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post("/auth/super/login", {
        email: normalizedEmail,
        password
      });
      const token = resp.data?.token as string | undefined;
      if (!token) {
        throw new Error("Missing token in super admin login response");
      }
      login({ token, companyId: "0", role: "super_admin" });
      nav("/super");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Super admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-showcase admin-showcase">
        <p className="badge-pill">Acceso de plataforma</p>
        <h1 className="showcase-title">Panel de Super User</h1>
        <p className="showcase-copy">
          Accede desde esta ruta exclusiva para administración global del SaaS multitenant.
        </p>
      </section>

      <div className="surface login-card">
        <div className="actions-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <h2 className="page-title">Login Admin</h2>
          <LanguageSwitcher />
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            Email admin
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@platform.com" autoComplete="username" />
          </label>

          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="btn-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar a panel super user"}
          </button>
        </form>
      </div>
    </div>
  );
}
