import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

const salonValueProps = [
  {
    title: "Season-ready beauty campaigns",
    text: "Launch spring nails, summer glow-ups, and holiday salon bundles with templates your team can publish in minutes.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Perfect intake forms",
    text: "Every form includes examples and clear hints so clients complete details correctly without extra follow-up calls.",
    image: "https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Social setup made simple",
    text: "Get step-by-step onboarding for Instagram, Facebook, WhatsApp, and TikTok to keep your booking pipeline full.",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80"
  }
];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("davidksinc@gmail.com");
  const [password, setPassword] = useState("M@davi19!");
  const [error, setError] = useState<string | null>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isSuperUser = email.trim().toLowerCase() === "davidksinc@gmail.com";
      const endpoint = isSuperUser ? "/auth/super/login" : "/auth/login";
      const body = isSuperUser ? { email, password } : { companyId, email, password };
      const resp = await api.post(endpoint, body);
      const token = resp.data?.token as string;
      const normalizedCompanyId = isSuperUser ? "0" : companyId;
      const role = isSuperUser ? "super_admin" : "company_admin";
      login({ token, companyId: normalizedCompanyId, role });
      nav("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const isSuperUser = email.trim().toLowerCase() === "davidksinc@gmail.com";

  return (
    <div className="login-shell beauty-theme">
      <section className="login-showcase">
        <div className="showcase-orb orb-one" />
        <div className="showcase-orb orb-two" />
        <p className="badge-pill">Beauty Partner OS · Salon + Nail Studios</p>
        <h1 className="showcase-title">Your perfect ally to grow beauty bookings every season.</h1>
        <p className="showcase-copy">
          A premium experience for salon owners, manicurists, and teams: faster lead capture, cleaner forms, and automated follow-up that feels personal.
        </p>

        <div className="showcase-metrics">
          <article className="metric-card">
            <p>+48%</p>
            <span>Qualified beauty leads</span>
          </article>
          <article className="metric-card">
            <p>2.9x</p>
            <span>More appointment requests</span>
          </article>
          <article className="metric-card">
            <p>-33%</p>
            <span>Manual admin workload</span>
          </article>
        </div>

        <div className="value-grid">
          {salonValueProps.map((item) => (
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
          {!isSuperUser && (
            <label>
              {t("login.companyId")}
              <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="Example: 65f1b512ab34cd7890ef1234" />
              <small className="field-help">Paste your company ID exactly as provided by your administrator.</small>
            </label>
          )}

          <label>
            {t("login.email")}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Example: owner@beautystudio.com" />
            <small className="field-help">Use davidksinc@gmail.com for super user access with company ID fixed to 0.</small>
          </label>

          <label>
            {t("login.password")}
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter your secure password" />
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
