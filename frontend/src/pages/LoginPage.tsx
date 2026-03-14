import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

const valueProps = [
  {
    title: "Prospección inteligente",
    text: "Automatiza seguimientos y prioriza leads con mayor intención de compra.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Pipeline saludable",
    text: "Visualiza en tiempo real dónde se enfrían tus oportunidades y actúa antes.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Crecimiento predecible",
    text: "Combina métricas de campañas, bots y ventas en un solo centro de control.",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
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
      <section className="login-showcase">
        <div className="showcase-orb orb-one" />
        <div className="showcase-orb orb-two" />
        <p className="badge-pill">Adquisición de clientes B2B</p>
        <h1 className="showcase-title">Convierte más conversaciones en ingresos reales.</h1>
        <p className="showcase-copy">
          Leadgen OS te ayuda a detectar oportunidades calientes, nutrir contactos en el momento correcto y cerrar más rápido.
        </p>

        <div className="showcase-metrics">
          <article className="metric-card">
            <p>+42%</p>
            <span>Leads cualificados</span>
          </article>
          <article className="metric-card">
            <p>3.5x</p>
            <span>Más demos agendadas</span>
          </article>
          <article className="metric-card">
            <p>-28%</p>
            <span>Costo por adquisición</span>
          </article>
        </div>

        <div className="value-grid">
          {valueProps.map((item) => (
            <article className="value-card" key={item.title}>
              <img src={item.image} alt={item.title} loading="lazy" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
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
            <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="699e..." />
          </label>
          <label>
            {t("login.email")}
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            {t("login.password")}
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
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
