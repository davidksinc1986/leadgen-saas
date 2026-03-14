import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState<string | null>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await api.post("/auth/login", { companyId, email, password });
      const token = resp.data?.token as string;
      login({ token, companyId });
      nav("/leads");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="surface login-card">
        <h2 className="page-title">Leadgen OS</h2>
        <p className="page-subtitle">Inicia sesión para gestionar leads, campañas y analítica comercial.</p>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            Company ID
            <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="699e..." />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="btn-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
