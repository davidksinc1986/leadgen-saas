import { useState } from "react";
import { postWithApiPrefixFallback } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

const useCases = [
  "Salones de belleza y barberías",
  "Inmobiliarias y agentes comerciales",
  "Clínicas, consultorios y servicios locales",
  "Equipos de ventas que captan leads por redes sociales"
];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedCompanyId = companyId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedCompanyId) {
      setError("Company ID es obligatorio.");
      return;
    }

    if (!normalizedEmail || !password) {
      setError("Email y password son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const resp = await postWithApiPrefixFallback<{ token: string }>("/auth/login", {
        companyId: normalizedCompanyId,
        email: normalizedEmail,
        password
      });
      const token = resp.data?.token as string | undefined;
      if (!token) {
        throw new Error("Missing token in login response");
      }
      login({ token, companyId: normalizedCompanyId, role: null });
      nav("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-showcase">
        <p className="badge-pill">Leadgen SaaS · Multi-tenant</p>
        <h1 className="showcase-title">Convierte conversaciones en clientes, sin importar tu industria.</h1>
        <p className="showcase-copy">
          Plataforma multitenant para captar leads desde redes sociales con mensajes automáticos, CTAs configurables y seguimiento comercial centralizado.
        </p>

        <div className="value-grid compact">
          {useCases.map((item) => (
            <article className="value-card" key={item}>
              <div>
                <h3>{item}</h3>
                <p>Flujos reutilizables para solicitar cita, llamada, visita o consulta.</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="surface login-card">
        <div className="actions-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <h2 className="page-title">{t("login.title")}</h2>
          <LanguageSwitcher />
        </div>
        <p className="page-subtitle">{t("login.subtitle")}</p>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            {t("login.companyId")}
            <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="Ej: 65f1b512ab34cd7890ef1234" autoComplete="organization" />
          </label>

          <label>
            {t("login.email")}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej: ventas@empresa.com" autoComplete="username" />
          </label>

          <label>
            {t("login.password")}
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="btn-primary" disabled={loading}>
            {loading ? t("login.entering") : t("login.enter")}
          </button>
        </form>
      </div>
    </div>
  );
}
