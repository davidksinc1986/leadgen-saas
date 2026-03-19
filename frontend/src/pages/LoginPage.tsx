import { useState } from "react";
import { postWithApiPrefixFallback } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";

const useCases = [
  { title: "Salones y clínicas", text: "Captura citas desde Instagram, WhatsApp y formularios con seguimiento automático." },
  { title: "Agencias y equipos B2B", text: "Pipeline con SLA, alertas y trazabilidad completa por ejecutivo." },
  { title: "Servicios locales", text: "Agenda, recordatorios y confirmaciones para reducir no-shows." },
  { title: "Ventas multicanal", text: "Distribución inteligente de leads por agente y nivel de prioridad." }
];

const featureBlocks = [
  {
    title: "Automatización de conversaciones",
    body: "Bots y flujos guiados para calificar leads en WhatsApp, Instagram, Messenger y web sin perder contexto de venta."
  },
  {
    title: "Embudo de conversión optimizado",
    body: "Visualiza cada etapa del lead, detecta cuellos de botella y ejecuta mejoras continuas con métricas accionables."
  },
  {
    title: "Dashboard ejecutivo estilo enterprise",
    body: "Métricas de captación, tiempo de respuesta, agendamiento y cierre para decidir más rápido y con datos confiables."
  },
  {
    title: "Multi-tenant con branding por empresa",
    body: "Cada company configura su identidad visual, reglas operativas y experiencia para admins y agentes en minutos."
  }
];

const seoSections = [
  {
    heading: "Estrategia SEO + SEM para crecer en Google y redes",
    copy:
      "Saas LeadGen está preparado para campañas de generación de demanda con landing pages de alta conversión, copy persuasivo y automatización comercial conectada a tu operación real."
  },
  {
    heading: "Keywords de alto valor para tu industria",
    copy:
      "Trabaja términos como generación de leads, agendamiento automático, CRM para ventas, automatización de WhatsApp y embudos de conversión con arquitectura de contenido orientada a intención de compra."
  },
  {
    heading: "Experiencia mobile-first para rankear y convertir",
    copy:
      "Diseño rápido, claro y adaptado a móviles para mejorar Core Web Vitals, interacción y tasa de cierre desde cualquier dispositivo."
  }
];

const faqs = [
  {
    q: "¿Saas LeadGen sirve para mi negocio local o equipo comercial?",
    a: "Sí. Está diseñado para salones, clínicas, inmobiliarias, agencias y equipos de ventas que quieren captar y convertir más leads de forma predecible."
  },
  {
    q: "¿Puedo integrar WhatsApp y manejar citas?",
    a: "Sí. Puedes centralizar conversaciones, agendar citas y dar seguimiento comercial con trazabilidad completa por agente."
  },
  {
    q: "¿Qué soporte ofrecen para implementación?",
    a: "Soporte directo por correo y WhatsApp para configuración inicial, optimización de flujos y buenas prácticas de conversión."
  }
];

type LoginResponse = {
  token: string;
  user?: {
    companyId?: string | null;
    role?: "company_admin" | "admin" | "agent" | "super_admin";
  };
};

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
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
      const resp = await postWithApiPrefixFallback<LoginResponse>("/auth/login", {
        email: normalizedEmail,
        password
      });
      const token = resp.data?.token;
      if (!token) throw new Error("Missing token in login response");
      login({ token, companyId: resp.data?.user?.companyId ?? null, role: resp.data?.user?.role ?? null });
      nav("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing-root">
      <section className="login-shell">
        <section className="login-showcase">
          <p className="badge-pill">Saas LeadGen · Conversión Inteligente</p>
          <h1 className="showcase-title">Plataforma de generación de leads para captar, agendar y cerrar más ventas.</h1>
          <p className="showcase-copy">
            Diseño moderno, enfoque mobile-first y experiencia guiada para admins y agentes. Lanza campañas, automatiza conversaciones y convierte contactos en clientes reales.
          </p>

          <div className="showcase-metrics">
            <div className="metric-card"><p>24/7</p><span>Atención automatizada</span></div>
            <div className="metric-card"><p>+5x</p><span>Mejora potencial en conversiones</span></div>
            <div className="metric-card"><p>Omni</p><span>WhatsApp · IG · FB · Web</span></div>
          </div>

          <div className="value-grid compact">
            {useCases.map((item) => (
              <article className="value-card" key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="hero-contact-row">
            <a className="btn" href="mailto:davidksinc@gmail.com">📧 davidksinc@gmail.com</a>
            <a className="btn btn-primary" href="https://wa.me/50670104017" target="_blank" rel="noreferrer">💬 WhatsApp +506 7010-4017</a>
          </div>
        </section>

        <aside className="surface login-card">
          <div className="actions-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2 className="page-title">{t("login.title")}</h2>
            <LanguageSwitcher />
          </div>
          <p className="page-subtitle">{t("login.subtitle")}</p>
          <div className="info-box" style={{ marginBottom: 16 }}>
            {t("login.workspaceHint")}
          </div>

          <form onSubmit={onSubmit} className="login-form">
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

          <div className="login-help">
            <span>¿Necesitas ayuda de configuración?</span>
            <a href="mailto:davidksinc@gmail.com">davidksinc@gmail.com</a>
            <a href="https://wa.me/50670104017" target="_blank" rel="noreferrer">WhatsApp CR: +506 7010-4017</a>
          </div>
        </aside>
      </section>

      <section className="landing-section light">
        <div className="landing-container">
          <h2>Solución completa de lead generation para empresas modernas</h2>
          <p>
            Desde captación multicanal hasta cierre comercial, Saas LeadGen combina automatización, CRM operativo y analítica para maximizar cada oportunidad.
          </p>
          <div className="feature-grid">
            {featureBlocks.map((f) => (
              <article className="feature-card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section dark">
        <div className="landing-container">
          <h2>Contenido optimizado para SEO y campañas SEM de alto rendimiento</h2>
          <div className="seo-grid">
            {seoSections.map((item) => (
              <article className="seo-card" key={item.heading}>
                <h3>{item.heading}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section light">
        <div className="landing-container faq-wrap">
          <h2>Preguntas frecuentes sobre Saas LeadGen</h2>
          <div className="faq-grid">
            {faqs.map((f) => (
              <article className="faq-card" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
