import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PageNav from "../components/PageNav";
import { useI18n } from "../i18n/I18nProvider";

type Condition = {
  path: string;
  op: "equals" | "notEquals" | "contains" | "in" | "gt" | "gte" | "lt" | "lte" | "exists" | "regex";
  value?: any;
};

type Option = { key: string; label: string; value: string };

type Question = {
  id: string;
  type: "choice" | "text" | "number";
  prompt: string;
  required?: boolean;
  saveTo: string;
  options?: Option[];
  showIf?: Condition[];
  next?: {
    defaultNextId?: string | null;
    rules?: Array<{ conditions: Condition[]; nextId: string }>;
  };
};

type BotFlow = {
  prompts?: { welcome?: string };
  questions?: Question[];
  finalMessage?: string;
};

type QuickSetupForm = {
  businessName: string;
  serviceType: string;
  objective: "appointment" | "sell" | "qualify";
  availableHours: string;
  channel: "whatsapp" | "instagram" | "messenger" | "webchat";
  timezone: string;
};


type QuickSetupTemplate = QuickSetupForm & {
  id: string;
  category: string;
  label: string;
  description: string;
};
type QuestionForm = {
  id: string;
  type: "choice" | "text" | "number";
  prompt: string;
  required: boolean;
  saveTo: string;
  options: Option[];
  defaultNextId: string;
  conditionalValue: string;
  conditionalNextId: string;
};

const defaultQuickSetup: QuickSetupForm = {
  businessName: "",
  serviceType: "",
  objective: "appointment",
  availableHours: "09:00-17:00",
  channel: "whatsapp",
  timezone: "UTC"
};


const quickSetupTemplates: QuickSetupTemplate[] = [
  {
    id: "beauty-salon",
    category: "Beauty",
    label: "Salon / Nails",
    description: "Reserva, servicios y huecos disponibles para belleza.",
    businessName: "Glow Studio",
    serviceType: "manicure, pedicure y nail art",
    objective: "appointment",
    availableHours: "09:00-19:00",
    channel: "whatsapp",
    timezone: "America/Mexico_City"
  },
  {
    id: "clinic",
    category: "Health",
    label: "Clinic / Medspa",
    description: "Captura síntomas, tratamiento y agenda valoración.",
    businessName: "Nova Clinic",
    serviceType: "valoraciones médicas y tratamientos estéticos",
    objective: "appointment",
    availableHours: "08:00-18:00",
    channel: "instagram",
    timezone: "America/Bogota"
  },
  {
    id: "real-estate",
    category: "Sales",
    label: "Real Estate",
    description: "Califica presupuesto, zona y urgencia de compra.",
    businessName: "Prime Realty",
    serviceType: "compra de propiedades residenciales",
    objective: "qualify",
    availableHours: "09:00-18:00",
    channel: "messenger",
    timezone: "America/New_York"
  },
  {
    id: "automotive",
    category: "Services",
    label: "Auto Workshop",
    description: "Detecta servicio requerido y prioridad de la cita.",
    businessName: "Torque Garage",
    serviceType: "mantenimiento automotriz y diagnóstico",
    objective: "appointment",
    availableHours: "08:00-17:30",
    channel: "whatsapp",
    timezone: "America/Chicago"
  },
  {
    id: "legal",
    category: "Professional",
    label: "Legal Intake",
    description: "Filtra tipo de caso, urgencia y contacto.",
    businessName: "Legal Partners",
    serviceType: "consultas legales y revisión de casos",
    objective: "qualify",
    availableHours: "09:00-17:00",
    channel: "webchat",
    timezone: "America/New_York"
  },
  {
    id: "education",
    category: "Education",
    label: "Courses / Academy",
    description: "Identifica programa, presupuesto y seguimiento comercial.",
    businessName: "Skill Academy",
    serviceType: "cursos, bootcamps y mentorías",
    objective: "sell",
    availableHours: "10:00-20:00",
    channel: "instagram",
    timezone: "UTC"
  }
];

const defaultQuestionForm = (): QuestionForm => ({
  id: `q_${Math.random().toString(36).slice(2, 8)}`,
  type: "text",
  prompt: "",
  required: true,
  saveTo: "nombre",
  options: [
    { key: "1", label: "Opción 1", value: "Opción 1" },
    { key: "2", label: "Opción 2", value: "Opción 2" }
  ],
  defaultNextId: "",
  conditionalValue: "",
  conditionalNextId: ""
});

function pretty(obj: unknown) {
  return JSON.stringify(obj, null, 2);
}

function normalizeId(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.startsWith("q_") ? cleaned : `q_${cleaned || "pregunta"}`;
}

function toForm(question: Question): QuestionForm {
  const firstRule = question.next?.rules?.[0];
  const firstCondition = firstRule?.conditions?.[0];
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    required: question.required !== false,
    saveTo: question.saveTo,
    options: question.options?.length ? question.options : defaultQuestionForm().options,
    defaultNextId: question.next?.defaultNextId ?? "",
    conditionalValue: firstCondition?.value ? String(firstCondition.value) : "",
    conditionalNextId: firstRule?.nextId ?? ""
  };
}

function fromForm(form: QuestionForm): Question {
  return {
    id: normalizeId(form.id),
    type: form.type,
    prompt: form.prompt.trim(),
    required: form.required,
    saveTo: form.saveTo.trim(),
    options: form.type === "choice" ? form.options.filter((option) => option.label.trim() && option.value.trim()) : [],
    next: {
      defaultNextId: form.defaultNextId || null,
      rules:
        form.conditionalValue && form.conditionalNextId
          ? [
              {
                conditions: [{ path: `answers.${normalizeId(form.id)}.value`, op: "equals", value: form.conditionalValue }],
                nextId: form.conditionalNextId
              }
            ]
          : []
    }
  };
}

export default function BotFlowPage() {
  const nav = useNavigate();
  const { t, locale } = useI18n();
  const [botFlow, setBotFlow] = useState<BotFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quickSetup, setQuickSetup] = useState<QuickSetupForm>(defaultQuickSetup);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(defaultQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [advancedJson, setAdvancedJson] = useState<string>(pretty(defaultQuestionForm()));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(quickSetupTemplates[0].id);

  const questions = useMemo(() => botFlow?.questions ?? [], [botFlow]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get("/company/me/bot-flow");
      const flow = resp.data?.botFlow ?? null;
      setBotFlow(flow);
      if (flow?.questions?.[0]) {
        const form = toForm(flow.questions[0]);
        setQuestionForm(form);
        setAdvancedJson(pretty(fromForm(form)));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo cargar el bot flow");
    } finally {
      setLoading(false);
    }
  }

  function setFormAndJson(next: QuestionForm) {
    setQuestionForm(next);
    setAdvancedJson(pretty(fromForm(next)));
  }

  function resetForm() {
    setEditingQuestionId(null);
    setFormAndJson(defaultQuestionForm());
  }

  function loadIntoEditor(question: Question) {
    setEditingQuestionId(question.id);
    setFormAndJson(toForm(question));
  }

  function applyTemplate(templateId: string) {
    const template = quickSetupTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setQuickSetup({
      businessName: template.businessName,
      serviceType: template.serviceType,
      objective: template.objective,
      availableHours: template.availableHours,
      channel: template.channel,
      timezone: template.timezone
    });
    setSuccess(locale === "en" ? "Template applied. You can edit every field before generating." : "Template aplicado. Puedes editar cada campo antes de generar.");
    setError(null);
  }

  async function runQuickSetup() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!quickSetup.businessName.trim() || !quickSetup.serviceType.trim()) {
        throw new Error(locale === "en" ? "Complete business name and service type before generating the flow." : "Completa el nombre del negocio y el tipo de servicio antes de generar el flujo.");
      }
      const resp = await api.post("/company/me/bot-flow/quick-setup", quickSetup);
      setBotFlow(resp.data?.botFlow ?? null);
      setSuccess("Quick Setup aplicado. Ya tienes un flujo base listo para operar.");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo ejecutar Quick Setup");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = fromForm(questionForm);
      if (!payload.prompt || !payload.saveTo) {
        throw new Error("Completa prompt y campo a guardar.");
      }
      if (editingQuestionId) {
        const { id: _ignore, ...patch } = payload;
        const resp = await api.patch(`/company/me/bot-flow/questions/${encodeURIComponent(editingQuestionId)}`, patch);
        setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
        setSuccess("Pregunta actualizada.");
      } else {
        const resp = await api.post("/company/me/bot-flow/questions", { question: payload });
        setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
        setSuccess("Pregunta agregada al flujo.");
      }
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.details?.join?.("\n") ?? err?.response?.data?.error ?? err?.message ?? "Error guardando pregunta");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm(`Eliminar ${id}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const resp = await api.delete(`/company/me/bot-flow/questions/${encodeURIComponent(id)}`);
      setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
      if (editingQuestionId === id) resetForm();
      setSuccess("Pregunta eliminada.");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Error eliminando pregunta");
    }
  }

  async function moveQuestion(id: string, toIndex: number) {
    setError(null);
    try {
      const resp = await api.post(`/company/me/bot-flow/questions/${encodeURIComponent(id)}/move`, { toIndex });
      setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Error moviendo pregunta");
    }
  }

  async function saveFinalMessage() {
    setSaving(true);
    try {
      const resp = await api.patch("/company/me/bot-flow", { finalMessage: botFlow?.finalMessage ?? "" });
      setBotFlow(resp.data?.botFlow ?? botFlow);
      setSuccess("Mensaje final guardado.");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo guardar el mensaje final");
    } finally {
      setSaving(false);
    }
  }

  async function applyAdvancedJson() {
    try {
      const parsed = JSON.parse(advancedJson);
      const form = toForm(parsed);
      setEditingQuestionId(parsed.id ?? null);
      setQuestionForm(form);
      setSuccess("JSON avanzado cargado en el editor visual.");
    } catch {
      setError("El JSON avanzado no es válido.");
    }
  }

  const [previewStep, setPreviewStep] = useState<string>("idle");
  const [previewData, setPreviewData] = useState<any>({});
  const [previewInput, setPreviewInput] = useState<string>("Hola");
  const [previewLog, setPreviewLog] = useState<Array<{ from: "user" | "bot"; text: string }>>([]);

  async function previewSend() {
    setError(null);
    try {
      const resp = await api.post("/company/me/bot-flow/preview", {
        step: previewStep,
        data: previewData,
        text: previewInput
      });
      const result = resp.data?.result;
      const mergedData = resp.data?.mergedData;
      setPreviewLog((prev) => [...prev, { from: "user", text: previewInput }]);
      if (result?.type === "reply") {
        setPreviewLog((prev) => [...prev, { from: "bot", text: result.text }]);
        setPreviewStep(result.nextStep ?? previewStep);
        setPreviewData(mergedData ?? previewData);
      }
      setPreviewInput("");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? "Preview failed");
    }
  }

  function previewReset() {
    setPreviewStep("idle");
    setPreviewData({});
    setPreviewLog([]);
    setPreviewInput("Hola");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("botflow.title")}</h2>
          <p className="page-subtitle">{t("botflow.subtitle")}</p>
        </div>
        <div className="actions-row">
          <PageNav />
          <LanguageSwitcher />
          <button onClick={() => nav("/settings")}>{t("common.settings")}</button>
          <button onClick={load} disabled={loading}>{t("common.refresh")}</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="info-box">{success}</div>}

      <div className="panel-grid" style={{ alignItems: "start" }}>
        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>{t("botflow.quickSetup")}</h3>
          <p className="page-subtitle">{t("botflow.quickSetupSubtitle")}</p>

          <div className="settings-cards" style={{ marginBottom: 12 }}>
            {quickSetupTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${selectedTemplateId === template.id ? "template-card-active" : ""}`}
                onClick={() => applyTemplate(template.id)}
              >
                <span className="badge-pill">{template.category}</span>
                <strong>{template.label}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>

          <div className="form-grid" style={{ display: "grid", gap: 12 }}>
            <input placeholder={locale === "en" ? "Business name" : "Nombre del negocio"} value={quickSetup.businessName} onChange={(e) => setQuickSetup({ ...quickSetup, businessName: e.target.value })} />
            <input placeholder={locale === "en" ? "Service type" : "Tipo de servicio"} value={quickSetup.serviceType} onChange={(e) => setQuickSetup({ ...quickSetup, serviceType: e.target.value })} />
            <select value={quickSetup.objective} onChange={(e) => setQuickSetup({ ...quickSetup, objective: e.target.value as QuickSetupForm["objective"] })}>
              <option value="appointment">Agendar cita</option>
              <option value="sell">Vender</option>
              <option value="qualify">Calificar leads</option>
            </select>
            <input placeholder={locale === "en" ? "Available hours (e.g. 09:00-17:00)" : "Horarios disponibles (ej: 09:00-17:00)"} value={quickSetup.availableHours} onChange={(e) => setQuickSetup({ ...quickSetup, availableHours: e.target.value })} />
            <select value={quickSetup.channel} onChange={(e) => setQuickSetup({ ...quickSetup, channel: e.target.value as QuickSetupForm["channel"] })}>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="messenger">Messenger</option>
              <option value="webchat">Webchat</option>
            </select>
            <input placeholder={locale === "en" ? "Timezone" : "Zona horaria"} value={quickSetup.timezone} onChange={(e) => setQuickSetup({ ...quickSetup, timezone: e.target.value })} />
          </div>

          <div className="actions-row" style={{ marginTop: 12 }}>
            <button className="btn-primary" onClick={runQuickSetup} disabled={saving}>{t("botflow.generate")}</button>
          </div>
        </section>

        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Editor no-code</h3>
          <p className="page-subtitle">Cada pregunta puede guardar datos, decidir el siguiente paso y agregar una bifurcación simple.</p>

          <div style={{ display: "grid", gap: 10 }}>
            <input placeholder="ID de la pregunta" value={questionForm.id} onChange={(e) => setFormAndJson({ ...questionForm, id: normalizeId(e.target.value) })} />
            <textarea placeholder="Pregunta" rows={3} value={questionForm.prompt} onChange={(e) => setFormAndJson({ ...questionForm, prompt: e.target.value })} />
            <select value={questionForm.type} onChange={(e) => setFormAndJson({ ...questionForm, type: e.target.value as QuestionForm["type"] })}>
              <option value="text">Texto libre</option>
              <option value="choice">Selección múltiple</option>
              <option value="number">Número</option>
            </select>
            <select value={questionForm.saveTo} onChange={(e) => setFormAndJson({ ...questionForm, saveTo: e.target.value })}>
              <option value="nombre">Nombre del lead</option>
              <option value="interes">Interés / servicio</option>
              <option value="presupuesto">Presupuesto</option>
              <option value="ubicacion">Ubicación</option>
              <option value="tiempoCompra">Urgencia</option>
              <option value="customFields.primaryGoal">Objetivo principal</option>
              <option value="customFields.preferredDay">Día preferido</option>
              <option value="customFields.preferredTimeBlock">Bloque horario</option>
            </select>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={questionForm.required} onChange={(e) => setFormAndJson({ ...questionForm, required: e.target.checked })} />
              Pregunta obligatoria
            </label>

            {questionForm.type === "choice" && (
              <div style={{ display: "grid", gap: 8 }}>
                <b>Opciones</b>
                {questionForm.options.map((option, index) => (
                  <div key={`${option.key}-${index}`} className="actions-row">
                    <input value={option.key} onChange={(e) => {
                      const options = [...questionForm.options];
                      options[index] = { ...options[index], key: e.target.value };
                      setFormAndJson({ ...questionForm, options });
                    }} placeholder="Key" />
                    <input value={option.label} onChange={(e) => {
                      const options = [...questionForm.options];
                      options[index] = { ...options[index], label: e.target.value };
                      setFormAndJson({ ...questionForm, options });
                    }} placeholder="Etiqueta" />
                    <input value={option.value} onChange={(e) => {
                      const options = [...questionForm.options];
                      options[index] = { ...options[index], value: e.target.value };
                      setFormAndJson({ ...questionForm, options });
                    }} placeholder="Valor guardado" />
                    <button onClick={() => setFormAndJson({ ...questionForm, options: questionForm.options.filter((_, optionIndex) => optionIndex !== index) })}>✕</button>
                  </div>
                ))}
                <button onClick={() => setFormAndJson({ ...questionForm, options: [...questionForm.options, { key: String(questionForm.options.length + 1), label: "Nueva opción", value: "Nueva opción" }] })}>+ Agregar opción</button>
              </div>
            )}

            <select value={questionForm.defaultNextId} onChange={(e) => setFormAndJson({ ...questionForm, defaultNextId: e.target.value })}>
              <option value="">Finalizar después de esta pregunta</option>
              {questions.filter((question) => question.id !== questionForm.id).map((question) => (
                <option key={question.id} value={question.id}>{question.prompt}</option>
              ))}
            </select>

            <div style={{ display: "grid", gap: 8 }}>
              <b>Bifurcación simple</b>
              <input placeholder="Si la respuesta es exactamente..." value={questionForm.conditionalValue} onChange={(e) => setFormAndJson({ ...questionForm, conditionalValue: e.target.value })} />
              <select value={questionForm.conditionalNextId} onChange={(e) => setFormAndJson({ ...questionForm, conditionalNextId: e.target.value })}>
                <option value="">Sin bifurcación</option>
                {questions.filter((question) => question.id !== questionForm.id).map((question) => (
                  <option key={question.id} value={question.id}>{question.prompt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="actions-row" style={{ marginTop: 12 }}>
            <button className="btn-primary" onClick={saveQuestion} disabled={saving}>{editingQuestionId ? "Actualizar pregunta" : "Agregar pregunta"}</button>
            <button onClick={resetForm}>Nueva pregunta</button>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary>Modo avanzado (JSON)</summary>
            <textarea rows={10} value={advancedJson} onChange={(e) => setAdvancedJson(e.target.value)} />
            <div className="actions-row" style={{ marginTop: 8 }}>
              <button onClick={applyAdvancedJson}>Cargar en editor visual</button>
            </div>
          </details>
        </section>
      </div>

      <section className="surface panel animated-card" style={{ marginTop: 16 }}>
        <div className="actions-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>Flujo actual</h3>
            <p className="page-subtitle">Ordena preguntas, edítalas y valida el recorrido que ejecutará el bot en producción.</p>
          </div>
        </div>

        <div className="card-grid">
          {questions.map((question, index) => (
            <article key={question.id} className="surface panel animated-card">
              <div className="actions-row" style={{ justifyContent: "space-between" }}>
                <strong>{index + 1}. {question.prompt}</strong>
                <span className="badge-pill">{question.type}</span>
              </div>
              <p className="page-subtitle">Guarda en: <b>{question.saveTo}</b></p>
              {question.next?.defaultNextId && <p className="page-subtitle">Siguiente: {question.next.defaultNextId}</p>}
              {!!question.next?.rules?.length && <p className="page-subtitle">Bifurcación: si coincide una regla, salta a {question.next.rules[0].nextId}</p>}
              {question.type === "choice" && (
                <div className="actions-row" style={{ flexWrap: "wrap" }}>
                  {(question.options ?? []).map((option) => <span key={option.key} className="badge-pill">{option.label}</span>)}
                </div>
              )}
              <div className="actions-row" style={{ marginTop: 10 }}>
                <button onClick={() => moveQuestion(question.id, index - 1)} disabled={index === 0}>↑</button>
                <button onClick={() => moveQuestion(question.id, index + 1)} disabled={index === questions.length - 1}>↓</button>
                <button onClick={() => loadIntoEditor(question)}>Editar</button>
                <button onClick={() => deleteQuestion(question.id)}>Eliminar</button>
              </div>
            </article>
          ))}
          {!questions.length && <div className="surface panel">Aún no hay preguntas. Usa Quick Setup o agrega la primera desde el editor.</div>}
        </div>
      </section>

      <section className="panel-grid" style={{ alignItems: "start", marginTop: 16 }}>
        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Mensaje final</h3>
          <textarea value={botFlow?.finalMessage ?? ""} onChange={(e) => setBotFlow((prev) => ({ ...(prev ?? {}), finalMessage: e.target.value }))} rows={4} />
          <div className="actions-row" style={{ marginTop: 10 }}>
            <button className="btn-primary" onClick={saveFinalMessage} disabled={saving}>Guardar mensaje final</button>
          </div>
        </section>

        <section className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Preview conversacional</h3>
          <p className="page-subtitle">Prueba el flujo real que ahora sí ejecuta el runtime del backend.</p>
          <div className="actions-row" style={{ marginBottom: 10 }}>
            <button onClick={previewReset}>Reset</button>
            <span><b>step:</b> {previewStep}</span>
          </div>
          <div className="surface chat-log">
            {previewLog.length === 0 ? (
              <div style={{ color: "#64748b" }}>Escribe un mensaje para comenzar la simulación.</div>
            ) : (
              previewLog.map((item, index) => (
                <div key={index} className={`chat-bubble ${item.from === "user" ? "chat-user" : "chat-bot"}`}>
                  <b>{item.from === "user" ? "Tú" : "Bot"}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{item.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="actions-row" style={{ marginTop: 8 }}>
            <input value={previewInput} onChange={(e) => setPreviewInput(e.target.value)} placeholder="Escribe aquí..." style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") previewSend(); }} />
            <button onClick={previewSend} disabled={!previewInput.trim()}>Enviar</button>
          </div>
          <details style={{ marginTop: 10 }}>
            <summary>Ver estado interno</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{pretty(previewData)}</pre>
          </details>
        </section>
      </section>
    </div>
  );
}
