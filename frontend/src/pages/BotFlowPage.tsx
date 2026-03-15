import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import LanguageSwitcher from "../components/LanguageSwitcher";

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
questions?: Question[];
finalMessage?: string;
};

function pretty(obj: any) {
return JSON.stringify(obj, null, 2);
}

export default function BotFlowPage() {
const [botFlow, setBotFlow] = useState<BotFlow | null>();
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>();

const [draftJson, setDraftJson] = useState<string>(() =>
  pretty({
    id: "q_interes",
    type: "choice",
    prompt: "¿Qué tipo de propiedad buscas?",
    saveTo: "interes",
    required: true,
    options: [
      { key: "1", label: "Casa", value: "Casa" },
      { key: "2", label: "Apartamento", value: "Apartamento" },
      { key: "3", label: "Lote", value: "Lote" },
      { key: "4", label: "Comercial", value: "Comercial" }
    ],
    next: { defaultNextId: "q_presupuesto", rules: [] }
  })
);

const questions = useMemo(() => botFlow?.questions ?? [], [botFlow]);

async function load() {
  setLoading(true);
  setError(null);
  try {
    const resp = await api.get("/company/me/bot-flow");
    setBotFlow(resp.data?.botFlow ?? null);
  } catch (e: any) {
    setError(e?.response?.data?.error ?? "No se pudo cargar bot flow");
  } finally {
    setLoading(false);
  }
}

async function addQuestion() {
  setError(null);
  try {
    const q = JSON.parse(draftJson);
    const resp = await api.post("/company/me/bot-flow/questions", { question: q });
    setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
  } catch (e: any) {
    const msg = e?.response?.data?.details?.join?.("\n") ?? e?.response?.data?.error ?? e?.message ?? "Error creando pregunta";
    setError(msg);
  }
}

async function updateQuestion(id: string) {
  setError(null);
  try {
    const q = JSON.parse(draftJson);
    const { id: _ignore, ...patch } = q;
    const resp = await api.patch(`/company/me/bot-flow/questions/${encodeURIComponent(id)}`, patch);
    setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
  } catch (e: any) {
    const msg = e?.response?.data?.details?.join?.("\n") ?? e?.response?.data?.error ?? e?.message ?? "Error actualizando pregunta";
    setError(msg);
  }
}

async function delQuestion(id: string) {
  if (!confirm(`Eliminar ${id}?`)) return;
  setError(null);
  try {
    const resp = await api.delete(`/company/me/bot-flow/questions/${encodeURIComponent(id)}`);
    setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
  } catch (e: any) {
    setError(e?.response?.data?.error ?? "Error eliminando pregunta");
  }
}

async function move(id: string, toIndex: number) {
  setError(null);
  try {
    const resp = await api.post(`/company/me/bot-flow/questions/${encodeURIComponent(id)}/move`, { toIndex });
    setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
  } catch (e: any) {
    setError(e?.response?.data?.error ?? "Error moviendo pregunta");
  }
}

async function createExampleFlow() {
  setError(null);

  const wipe = confirm("¿Quieres BORRAR las preguntas actuales y crear un flujo ejemplo?");
  if (wipe) {
    for (const q of questions) {
      await api.delete(`/company/me/bot-flow/questions/${encodeURIComponent(q.id)}`);
    }
  }

  // crear preguntas base en orden (sin referencias rotas)
  const q_presupuesto: Question = {
    id: "q_presupuesto",
    type: "text",
    prompt: "¿Cuál es tu presupuesto aproximado?",
    saveTo: "presupuesto",
    required: true,
    next: { defaultNextId: "q_ubicacion", rules: [] }
  };

  const q_ubicacion: Question = {
    id: "q_ubicacion",
    type: "text",
    prompt: "¿En qué ubicación/zona buscas? (ciudad, barrio o sector)",
    saveTo: "ubicacion",
    required: true,
    next: { defaultNextId: "q_tiempo", rules: [] }
  };

  const q_tiempo: Question = {
    id: "q_tiempo",
    type: "choice",
    prompt: "¿En qué tiempo planeas comprar?",
    saveTo: "tiempoCompra",
    required: true,
    options: [
      { key: "1", label: "Inmediato (0-1 mes)", value: "Inmediato (0-1 mes)" },
      { key: "2", label: "1-3 meses", value: "1-3 meses" },
      { key: "3", label: "3-6 meses", value: "3-6 meses" },
      { key: "4", label: "6+ meses", value: "6+ meses" }
    ],
    next: { defaultNextId: null, rules: [] }
  };

  const q_interes: Question = {
    id: "q_interes",
    type: "choice",
    prompt: "¿Qué tipo de propiedad buscas?",
    saveTo: "interes",
    required: true,
    options: [
      { key: "1", label: "Casa", value: "Casa" },
      { key: "2", label: "Apartamento", value: "Apartamento" },
      { key: "3", label: "Lote", value: "Lote" },
      { key: "4", label: "Comercial", value: "Comercial" }
    ],
    next: {
      defaultNextId: "q_presupuesto",
      rules: [
        {
          conditions: [{ path: "answers.q_interes.value", op: "equals", value: "Comercial" }],
          nextId: "q_ubicacion"
        }
      ]
    }
  };

  // crea en orden (targets primero, q_interes al final)
  await api.post("/company/me/bot-flow/questions", { question: q_presupuesto });
  await api.post("/company/me/bot-flow/questions", { question: q_ubicacion });
  await api.post("/company/me/bot-flow/questions", { question: q_tiempo });
  await api.post("/company/me/bot-flow/questions", { question: q_interes });

  await load();
  alert("Flujo ejemplo creado.");
}

// ---- Preview ----
const [previewStep, setPreviewStep] = useState<string>("idle");
const [previewData, setPreviewData] = useState<any>({});
const [previewInput, setPreviewInput] = useState<string>("Quiero información");
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
  } catch (e: any) {
    setError(e?.response?.data?.error ?? e?.message ?? "Preview failed");
  }
}

function previewReset() {
  setPreviewStep("idle");
  setPreviewData({});
  setPreviewLog([]);
  setPreviewInput("Quiero información");
}

function loadIntoEditor(q: Question) {
  setDraftJson(pretty(q));
}

useEffect(() => {
  load();
}, []);

return (
  <div className="page">
    <div className="page-header">
      <div><h2 className="page-title">Bot Flow Builder</h2><p className="page-subtitle">Configure intake questions, automation logic, and conversational preview for beauty clients.</p></div>
      <div className="actions-row">
          <LanguageSwitcher />
        <button onClick={createExampleFlow}>Create beauty sample flow</button>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>
    </div>

    <p className="page-subtitle">
      Question CRUD + live preview. Add clear examples in each prompt to reduce incomplete lead forms.
    </p>

    {error && <div className="error-box">{error}</div>}

    <div className="panel-grid" style={{ alignItems: "start" }}>
      <div>
        <h3>Preguntas ({questions.length})</h3>

        <div className="data-table-wrap">
          <table className="data-table" cellPadding={10}>
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>Tipo</th>
                <th>saveTo</th>
                <th>Orden</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => (
                <tr key={q.id}>
                  <td>{idx}</td>
                  <td className="mono">{q.id}</td>
                  <td>{q.type}</td>
                  <td>{q.saveTo}</td>
                  <td><div className="actions-row">
                    <button disabled={idx === 0} onClick={() => move(q.id, idx - 1)}>↑</button>
                    <button disabled={idx === questions.length - 1} onClick={() => move(q.id, idx + 1)}>↓</button>
                  </div></td>
                  <td><div className="actions-row">
                    <button onClick={() => loadIntoEditor(q)}>Editar</button>
                    <button onClick={() => delQuestion(q.id)}>Eliminar</button>
                  </div></td>
                </tr>
              ))}
              {!questions.length && (
                <tr>
                  <td colSpan={6} style={{ color: "#64748b" }}>
                    No questions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Final message</h4>
          <textarea
            value={botFlow?.finalMessage ?? ""}
            onChange={(e) => setBotFlow((prev) => ({ ...(prev ?? {}), finalMessage: e.target.value }))}
            rows={3}
          />
          <button
            onClick={async () => {
              try {
                const resp = await api.patch("/company/me/bot-flow", { finalMessage: botFlow?.finalMessage ?? "" });
                setBotFlow(resp.data?.botFlow ?? botFlow);
              } catch (e: any) {
                setError(e?.response?.data?.error ?? "Error guardando finalMessage");
              }
            }}
          >
            Save final message
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Preview</h3>
          <p className="page-subtitle">Recommended social setup prompt: ask for Instagram handle, WhatsApp number, and preferred contact method.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={previewReset}>Reset</button>
            <div style={{ color: "#666" }}><b>step:</b> {previewStep}</div>
          </div>

          <div className="surface chat-log">
            {previewLog.length === 0 ? (
              <div style={{ color: "#64748b" }}>Send a message to test your flow.</div>
            ) : (
              previewLog.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.from === "user" ? "chat-user" : "chat-bot"}`}>
                  <b>{m.from === "user" ? "Tú" : "Bot"}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              placeholder="Escribe aquí..."
              style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === "Enter") previewSend(); }}
            />
            <button onClick={previewSend} disabled={!previewInput.trim()}>Enviar</button>
          </div>

          <details style={{ marginTop: 10 }}>
            <summary>Ver previewData (debug)</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{pretty(previewData)}</pre>
          </details>
        </div>
      </div>

      <div>
        <h3>Editor (JSON)</h3>
        <textarea
          value={draftJson}
          onChange={(e) => setDraftJson(e.target.value)}
          rows={28}
          className="mono"
        />

        <div className="actions-row" style={{ marginTop: 10 }}>
          <button onClick={addQuestion}>Crear (POST)</button>
          <button
            onClick={() => {
              try {
                const q = JSON.parse(draftJson);
                if (!q?.id) return setError("El JSON debe incluir id (ej: q_interes) para actualizar");
                updateQuestion(String(q.id));
              } catch (e: any) {
                setError(e?.message ?? "JSON inválido");
              }
            }}
          >
            Actualizar por id (PATCH)
          </button>
        </div>
      </div>
    </div>
  </div>
);
}