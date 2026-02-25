import { ConversationDoc } from "../models/Conversation.js";

export type Condition = {
path: string;
op: "equals" | "notEquals" | "contains" | "in" | "gt" | "gte" | "lt" | "lte" | "exists" | "regex";
value?: any;
};

export type BotOption = { key: string; label: string; value: string };

export type BotQuestion = {
id: string;
type: "choice" | "text" | "number";
prompt: string;
required?: boolean;
saveTo: string; // "presupuesto" | "customFields.habitaciones" etc
options?: BotOption[];
showIf?: Condition[];
next?: { defaultNextId?: string | null; rules?: Array<{ conditions: Condition[]; nextId: string }> };
};

export type BotFlowConfig = {
// legacy
enabledQuestions?: { presupuesto?: boolean; ubicacion?: boolean; tiempoCompra?: boolean };
prompts?: {
  welcome?: string;
  askPropertyType?: string;
  askBudget?: string;
  askLocation?: string;
  askTime?: string;
  invalidOption?: string;
};
propertyOptions?: BotOption[];
timeOptions?: BotOption[];

// builder
questions?: BotQuestion[];
finalMessage?: string;
};

export type FlowResult =
| {
    type: "reply";
    text: string;
    nextStep?: string; // "q:<id>" | legacy steps | "idle"
    leadPatch?: Record<string, any>;
    convoDataPatch?: Record<string, any>;
    completed?: boolean; // marca final del flujo
  }
| { type: "noop" };

function normalize(text: string) {
return (text ?? "").trim();
}
function normalizeLower(text: string) {
return normalize(text).toLowerCase();
}
function isReset(text: string) {
const t = normalizeLower(text);
return t === "reiniciar" || t === "reset" || t === "menu" || t === "inicio";
}

function getPath(obj: any, path: string) {
return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function evalCondition(ctx: any, c: Condition): boolean {
const actual = getPath(ctx, c.path);

switch (c.op) {
  case "exists":
    return actual !== undefined && actual !== null && actual !== "";
  case "equals":
    return actual === c.value;
  case "notEquals":
    return actual !== c.value;
  case "contains":
    if (typeof actual === "string") return typeof c.value === "string" ? actual.includes(c.value) : false;
    if (Array.isArray(actual)) return actual.includes(c.value);
    return false;
  case "in":
    return Array.isArray(c.value) ? c.value.includes(actual) : false;
  case "gt":
    return Number(actual) > Number(c.value);
  case "gte":
    return Number(actual) >= Number(c.value);
  case "lt":
    return Number(actual) < Number(c.value);
  case "lte":
    return Number(actual) <= Number(c.value);
  case "regex":
    try {
      const r = new RegExp(String(c.value));
      return r.test(String(actual ?? ""));
    } catch {
      return false;
    }
  default:
    return false;
}
}

function evalAll(ctx: any, conditions?: Condition[]) {
if (!conditions || !conditions.length) return true;
return conditions.every((c) => evalCondition(ctx, c));
}

function stepToQuestionId(step: string) {
return step.startsWith("q:") ? step.slice(2) : null;
}

function makeLeadPatch(saveTo: string, value: any): Record<string, any> {
// permite "customFields.xxx"
return { [saveTo]: value };
}

function parseAnswer(q: BotQuestion, raw: string): { ok: boolean; value?: any; errorText?: string } {
const t = normalize(raw);
const required = q.required !== false;

if (!t && required) return { ok: false, errorText: q.prompt };

if (q.type === "choice") {
  const opt = (q.options ?? []).find((o) => o.key === normalizeLower(raw));
  if (!opt) return { ok: false, errorText: q.prompt };
  return { ok: true, value: opt.value };
}

if (q.type === "number") {
  const n = Number(t.replace(/[^\d.-]/g, ""));
  if (Number.isNaN(n)) return { ok: false, errorText: q.prompt };
  return { ok: true, value: n };
}

// text
return { ok: true, value: t };
}

function findNextQuestionId(params: {
questions: BotQuestion[];
currentIndex: number;
ctx: any;
currentQuestion: BotQuestion;
}): string | null {
const { questions, currentIndex, ctx, currentQuestion } = params;

// 1) reglas de salto
const rules = currentQuestion.next?.rules ?? [];
for (const r of rules) {
  if (evalAll(ctx, r.conditions)) return r.nextId;
}

// 2) defaultNextId explícito
if (currentQuestion.next?.defaultNextId) return currentQuestion.next.defaultNextId;

// 3) siguiente en orden que cumpla showIf
for (let i = currentIndex + 1; i < questions.length; i++) {
  const q = questions[i];
  if (evalAll(ctx, q.showIf)) return q.id;
}

return null;
}

// ----- Legacy flow (tu modo anterior) -----
// Para mantener compatibilidad: si NO hay questions[], usamos el flujo actual que ya tenías.
function legacyFlow(messageText: string, convo: ConversationDoc, cfg: Required<BotFlowConfig>): FlowResult {
const text = normalize(messageText);
const textLower = normalizeLower(messageText);

const trigger =
  textLower.includes("quiero información") ||
  textLower.includes("quiero informacion") ||
  textLower.includes("información") ||
  textLower.includes("informacion") ||
  textLower === "info";

if (convo.step === "idle" && trigger) {
  return { type: "reply", text: `${cfg.prompts!.welcome}\n\n${cfg.prompts!.askPropertyType}`, nextStep: "choose_property" };
}

if (convo.step === "choose_property") {
  const opt = (cfg.propertyOptions ?? []).find(o => o.key === textLower);
  if (!opt) return { type: "reply", text: cfg.prompts!.invalidOption!, nextStep: "choose_property" };

  // saltos según enabledQuestions
  if (cfg.enabledQuestions?.presupuesto) {
    return { type: "reply", text: cfg.prompts!.askBudget!, nextStep: "ask_budget", leadPatch: { interes: opt.value }, convoDataPatch: { interes: opt.value } };
  }
  if (cfg.enabledQuestions?.ubicacion) {
    return { type: "reply", text: cfg.prompts!.askLocation!, nextStep: "ask_location", leadPatch: { interes: opt.value }, convoDataPatch: { interes: opt.value } };
  }
  if (cfg.enabledQuestions?.tiempoCompra) {
    return { type: "reply", text: cfg.prompts!.askTime!, nextStep: "ask_time", leadPatch: { interes: opt.value }, convoDataPatch: { interes: opt.value } };
  }
  return { type: "reply", text: cfg.finalMessage ?? "Listo.", nextStep: "idle", leadPatch: { interes: opt.value }, convoDataPatch: { interes: opt.value }, completed: true };
}

if (convo.step === "ask_budget") {
  if (!text) return { type: "reply", text: cfg.prompts!.askBudget!, nextStep: "ask_budget" };

  if (cfg.enabledQuestions?.ubicacion) {
    return { type: "reply", text: cfg.prompts!.askLocation!, nextStep: "ask_location", leadPatch: { presupuesto: text }, convoDataPatch: { presupuesto: text } };
  }
  if (cfg.enabledQuestions?.tiempoCompra) {
    return { type: "reply", text: cfg.prompts!.askTime!, nextStep: "ask_time", leadPatch: { presupuesto: text }, convoDataPatch: { presupuesto: text } };
  }
  return { type: "reply", text: cfg.finalMessage ?? "Listo.", nextStep: "idle", leadPatch: { presupuesto: text }, convoDataPatch: { presupuesto: text }, completed: true };
}

if (convo.step === "ask_location") {
  if (text.length < 2) return { type: "reply", text: cfg.prompts!.askLocation!, nextStep: "ask_location" };

  if (cfg.enabledQuestions?.tiempoCompra) {
    return { type: "reply", text: cfg.prompts!.askTime!, nextStep: "ask_time", leadPatch: { ubicacion: text }, convoDataPatch: { ubicacion: text } };
  }
  return { type: "reply", text: cfg.finalMessage ?? "Listo.", nextStep: "idle", leadPatch: { ubicacion: text }, convoDataPatch: { ubicacion: text }, completed: true };
}

if (convo.step === "ask_time") {
  const opt = (cfg.timeOptions ?? []).find(o => o.key === textLower);
  const tiempoCompra = opt?.value ?? (text.length >= 2 ? text : "");
  if (!tiempoCompra) return { type: "reply", text: cfg.prompts!.askTime!, nextStep: "ask_time" };

  return {
    type: "reply",
    text: cfg.finalMessage ?? "Listo.",
    nextStep: "idle",
    leadPatch: { tiempoCompra },
    convoDataPatch: { tiempoCompra },
    completed: true
  };
}

return { type: "noop" };
}

function mergeCfg(cfg?: BotFlowConfig): Required<BotFlowConfig> {
return {
  enabledQuestions: { presupuesto: true, ubicacion: true, tiempoCompra: true, ...(cfg?.enabledQuestions ?? {}) },
  prompts: {
    welcome: "Hola, soy el asistente virtual.",
    askPropertyType: "¿Qué tipo de propiedad buscas?\n1 Casa\n2 Apartamento\n3 Lote\n4 Comercial",
    askBudget: '¿Cuál es tu presupuesto aproximado? (ej: 250.000.000 o "hasta 250M")',
    askLocation: "¿En qué ubicación/zona buscas? (ciudad, barrio o sector)",
    askTime: "¿En qué tiempo planeas comprar?\n1 Inmediato (0-1 mes)\n2 1-3 meses\n3 3-6 meses\n4 6+ meses",
    invalidOption: "Por favor responde con una opción válida.",
    ...(cfg?.prompts ?? {})
  },
  propertyOptions: cfg?.propertyOptions?.length
    ? cfg.propertyOptions
    : [
        { key: "1", label: "Casa", value: "Casa" },
        { key: "2", label: "Apartamento", value: "Apartamento" },
        { key: "3", label: "Lote", value: "Lote" },
        { key: "4", label: "Comercial", value: "Comercial" }
      ],
  timeOptions: cfg?.timeOptions?.length
    ? cfg.timeOptions
    : [
        { key: "1", label: "Inmediato (0-1 mes)", value: "Inmediato (0-1 mes)" },
        { key: "2", label: "1-3 meses", value: "1-3 meses" },
        { key: "3", label: "3-6 meses", value: "3-6 meses" },
        { key: "4", label: "6+ meses", value: "6+ meses" }
      ],
  questions: cfg?.questions ?? [],
  finalMessage: cfg?.finalMessage ?? "¡Listo! Ya tengo tu información. Un asesor te contactará pronto."
};
}

export function handleInboundText(messageText: string, convo: ConversationDoc, companyCfg?: BotFlowConfig): FlowResult {
const cfg = mergeCfg(companyCfg);
const text = normalize(messageText);
const textLower = normalizeLower(messageText);

if (isReset(text)) {
  if (cfg.questions?.length) {
    const ctx = { answers: {}, lead: {} };
    const first = cfg.questions.find((q) => evalAll(ctx, q.showIf)) ?? null;
    if (!first) return { type: "reply", text: cfg.finalMessage!, nextStep: "idle", completed: true };
    return { type: "reply", text: first.prompt, nextStep: `q:${first.id}`, convoDataPatch: { answers: {}, leadDraft: {} } };
  }
  return { type: "reply", text: `${cfg.prompts!.welcome}\n\n${cfg.prompts!.askPropertyType}`, nextStep: "choose_property", convoDataPatch: {} };
}

// trigger inicial
const trigger =
  textLower.includes("quiero información") ||
  textLower.includes("quiero informacion") ||
  textLower.includes("información") ||
  textLower.includes("informacion") ||
  textLower === "info";

// ----- Builder mode -----
if (cfg.questions?.length) {
  const stepQid = stepToQuestionId(convo.step);

  // start
  if (convo.step === "idle" && trigger) {
    const ctx = { answers: convo.data?.answers ?? {}, lead: convo.data?.leadDraft ?? {} };
    const first = cfg.questions.find((q) => evalAll(ctx, q.showIf)) ?? null;
    if (!first) return { type: "reply", text: cfg.finalMessage!, nextStep: "idle", completed: true };
    return { type: "reply", text: first.prompt, nextStep: `q:${first.id}`, convoDataPatch: { answers: ctx.answers, leadDraft: ctx.lead } };
  }

  // answering a question
  if (stepQid) {
    const questions = cfg.questions;
    const idx = questions.findIndex((q) => q.id === stepQid);
    if (idx === -1) return { type: "reply", text: cfg.finalMessage!, nextStep: "idle", completed: true };

    const q = questions[idx];

    const ctx = {
      answers: convo.data?.answers ?? {},
      lead: convo.data?.leadDraft ?? {}
    };

    // si no cumple showIf en este momento, lo saltamos al siguiente
    if (!evalAll(ctx, q.showIf)) {
      const nextId = findNextQuestionId({ questions, currentIndex: idx, ctx, currentQuestion: q });
      if (!nextId) return { type: "reply", text: cfg.finalMessage!, nextStep: "idle", completed: true };
      const nextQ = questions.find((qq) => qq.id === nextId);
      return { type: "reply", text: nextQ?.prompt ?? cfg.finalMessage!, nextStep: `q:${nextId}` };
    }

    const parsed = parseAnswer(q, messageText);
    if (!parsed.ok) return { type: "reply", text: parsed.errorText ?? q.prompt, nextStep: `q:${q.id}` };

    const value = parsed.value;

    // patches
    const leadPatch = makeLeadPatch(q.saveTo, value);
    const answersPatch = {
      ...(ctx.answers ?? {}),
      [q.id]: { value, raw: messageText, at: new Date().toISOString() }
    };
    const leadDraftPatch = { ...(ctx.lead ?? {}), ...leadPatch };

    // actualizar ctx para evaluar reglas
    const ctx2 = { answers: answersPatch, lead: leadDraftPatch };

    // next
    const nextIdRaw = findNextQuestionId({ questions, currentIndex: idx, ctx: ctx2, currentQuestion: q });
    const nextQ = nextIdRaw ? questions.find((qq) => qq.id === nextIdRaw) : null;

    // si el next apunta a algo que no pasa showIf, avanzamos por orden
    let nextId = nextIdRaw;
    if (nextQ && !evalAll(ctx2, nextQ.showIf)) {
      nextId = null;
      for (let i = idx + 1; i < questions.length; i++) {
        if (evalAll(ctx2, questions[i].showIf)) {
          nextId = questions[i].id;
          break;
        }
      }
    }

    if (!nextId) {
      return {
        type: "reply",
        text: cfg.finalMessage!,
        nextStep: "idle",
        leadPatch,
        convoDataPatch: { answers: answersPatch, leadDraft: leadDraftPatch },
        completed: true
      };
    }

    const nextQuestion = questions.find((qq) => qq.id === nextId)!;

    return {
      type: "reply",
      text: nextQuestion.prompt,
      nextStep: `q:${nextId}`,
      leadPatch,
      convoDataPatch: { answers: answersPatch, leadDraft: leadDraftPatch }
    };
  }

  return { type: "noop" };
}

// ----- Legacy mode -----
return legacyFlow(messageText, convo, cfg);
}
