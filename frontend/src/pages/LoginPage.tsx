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
  <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
    <h2>Leadgen Chat — Admin</h2>
    <p style={{ color: "#555" }}>Inicia sesión para ver y gestionar leads.</p>

    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        Company ID
        <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="699e..." style={{ width: "100%", padding: 10 }} />
      </label>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10 }} />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={{ width: "100%", padding: 10 }} />
      </label>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <button disabled={loading} style={{ padding: 12, cursor: "pointer" }}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  </div>
);
}
