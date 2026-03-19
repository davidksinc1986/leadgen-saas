import { ConversationDoc } from "../models/Conversation.js";
import type { OutboundMessage, ChoiceOption } from "../channels/types.js";

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
  saveTo: string;
  options?: BotOption[];
  showIf?: Condition[];
  next?: { defaultNextId?: string | null; rules?: Array<{ conditions: Condition[]; nextId: string }> };
};

export type BotFlowConfig = {
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
  questions?: BotQuestion[];
  finalMessage?: string;
};

export type ReplyResult = {
  type: "reply";
  text: string;
  message?: OutboundMessage;
  nextStep?: string;
  leadPatch?: Record<string, any>;
  convoDataPatch?: Record<string, any>;
  completed?: boolean;
};

export type FlowResult = ReplyResult | { type: "noop" };

type AnswerEntry = {
  questionId: string;
  prompt: string;
  value: string | number;
  label?: string;
  saveTo: string;
  answeredAt: string;
};

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

function toChoiceOptions(opts?: BotOption[]): ChoiceOption[] {
  return (opts ?? []).map((o) => ({
    id: String(o.key),
    title: String(o.label || o.value || o.key)
  }));
}

function choiceFallbackText(prompt: string, opts?: BotOption[]) {
  const lines = (opts ?? []).map((o) => `${o.key} ${o.label || o.value}`);
  return [prompt, ...lines].join("\n");
}

function replyChoice(prompt: string, opts?: BotOption[], ui: "auto" | "buttons" | "list" = "auto"): ReplyResult {
  const options = toChoiceOptions(opts);
  return {
    type: "reply",
    text: choiceFallbackText(prompt, opts),
    message: { kind: "choice", text: prompt, options, ui }
  };
}

function replyText(text: string): ReplyResult {
  return { type: "reply", text, message: { kind: "text", text } };
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

function getByPath(source: any, path: string) {
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function evaluateCondition(condition: Condition, state: any) {
  const actual = getByPath(state, condition.path);
  switch (condition.op) {
    case "equals":
      return actual === condition.value;
    case "notEquals":
      return actual !== condition.value;
    case "contains":
      return Array.isArray(actual)
        ? actual.includes(condition.value)
        : String(actual ?? "").toLowerCase().includes(String(condition.value ?? "").toLowerCase());
    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(actual) : false;
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "exists":
      return condition.value === false ? actual == null : actual != null && actual !== "";
    case "regex":
      return new RegExp(String(condition.value ?? ""), "i").test(String(actual ?? ""));
    default:
      return false;
  }
}

function isQuestionVisible(question: BotQuestion, state: any) {
  const conditions = question.showIf ?? [];
  return conditions.every((condition) => evaluateCondition(condition, state));
}

function findQuestionById(questions: BotQuestion[], id?: string | null) {
  if (!id) return undefined;
  return questions.find((question) => question.id === id);
}

function getFirstVisibleQuestion(questions: BotQuestion[], state: any) {
  return questions.find((question) => isQuestionVisible(question, state));
}

function getNextQuestionFrom(question: BotQuestion, questions: BotQuestion[], state: any) {
  const ruleTarget = (question.next?.rules ?? []).find((rule) => rule.conditions.every((condition) => evaluateCondition(condition, state)))?.nextId;
  const explicitTarget = ruleTarget ?? question.next?.defaultNextId ?? null;
  if (explicitTarget) {
    const nextQuestion = findQuestionById(questions, explicitTarget);
    if (nextQuestion && isQuestionVisible(nextQuestion, state)) return nextQuestion;
  }

  const currentIndex = questions.findIndex((item) => item.id === question.id);
  for (let index = currentIndex + 1; index < questions.length; index += 1) {
    const nextQuestion = questions[index];
    if (isQuestionVisible(nextQuestion, state)) return nextQuestion;
  }

  return null;
}

function createLeadPatch(saveTo: string, value: string | number) {
  if (saveTo.startsWith("customFields.")) {
    return { [saveTo]: value };
  }
  return { [saveTo]: value };
}

function getConversationState(convo: ConversationDoc) {
  const data = (convo.data ?? {}) as Record<string, any>;
  return {
    ...data,
    answers: data.answers ?? {}
  };
}

function questionPrompt(question: BotQuestion) {
  return question.type === "choice" ? replyChoice(question.prompt, question.options, "auto") : replyText(question.prompt);
}

function answerQuestion(question: BotQuestion, messageText: string): { answer: AnswerEntry; leadPatch: Record<string, any> } | { error: ReplyResult } {
  const text = normalize(messageText);

  if (question.type === "choice") {
    const option = (question.options ?? []).find((candidate) => {
      const normalizedCandidate = [candidate.key, candidate.label, candidate.value].map((value) => normalizeLower(String(value)));
      return normalizedCandidate.includes(normalizeLower(text));
    });

    if (!option) {
      return { error: { ...replyChoice(`⚠️ ${question.prompt}`, question.options, "auto"), nextStep: question.id } };
    }

    return {
      answer: {
        questionId: question.id,
        prompt: question.prompt,
        value: option.value,
        label: option.label,
        saveTo: question.saveTo,
        answeredAt: new Date().toISOString()
      },
      leadPatch: createLeadPatch(question.saveTo, option.value)
    };
  }

  if (!text && question.required !== false) {
    return { error: { ...replyText(question.prompt), nextStep: question.id } };
  }

  if (question.type === "number") {
    const parsed = Number(text.replace(/,/g, "."));
    if (Number.isNaN(parsed)) {
      return { error: { ...replyText(`Ingresa un valor numérico válido.\n\n${question.prompt}`), nextStep: question.id } };
    }
    return {
      answer: {
        questionId: question.id,
        prompt: question.prompt,
        value: parsed,
        saveTo: question.saveTo,
        answeredAt: new Date().toISOString()
      },
      leadPatch: createLeadPatch(question.saveTo, parsed)
    };
  }

  return {
    answer: {
      questionId: question.id,
      prompt: question.prompt,
      value: text,
      saveTo: question.saveTo,
      answeredAt: new Date().toISOString()
    },
    leadPatch: createLeadPatch(question.saveTo, text)
  };
}

function builderFlow(messageText: string, convo: ConversationDoc, cfg: Required<BotFlowConfig>): FlowResult {
  const text = normalize(messageText);
  const lower = normalizeLower(messageText);
  const state = getConversationState(convo);
  const questions = cfg.questions;

  if (!questions.length) return { type: "noop" };

  if (isReset(text)) {
    const firstQuestion = getFirstVisibleQuestion(questions, { answers: {} });
    if (!firstQuestion) return { ...replyText(cfg.finalMessage), nextStep: "idle", completed: true, convoDataPatch: { answers: {}, currentQuestionId: null } };
    return {
      ...questionPrompt(firstQuestion),
      nextStep: firstQuestion.id,
      convoDataPatch: { answers: {}, currentQuestionId: firstQuestion.id }
    };
  }

  const shouldStart = convo.step === "idle" || !findQuestionById(questions, convo.step);
  if (shouldStart) {
    const trigger = lower.includes("quiero") || lower.includes("hola") || lower.includes("info") || lower.includes("empezar") || lower.length > 0;
    if (!trigger) return { type: "noop" };
    const firstQuestion = getFirstVisibleQuestion(questions, state);
    if (!firstQuestion) return { ...replyText(cfg.finalMessage), nextStep: "idle", completed: true };
    return {
      ...questionPrompt(firstQuestion),
      nextStep: firstQuestion.id,
      convoDataPatch: { ...state, currentQuestionId: firstQuestion.id }
    };
  }

  const currentQuestion = findQuestionById(questions, convo.step);
  if (!currentQuestion) return { type: "noop" };

  const answered = answerQuestion(currentQuestion, messageText);
  if ("error" in answered) return answered.error;

  const answers = {
    ...(state.answers ?? {}),
    [currentQuestion.id]: answered.answer
  };
  const nextState = {
    ...state,
    answers,
    currentQuestionId: null,
    lastAnsweredQuestionId: currentQuestion.id
  };

  const nextQuestion = getNextQuestionFrom(currentQuestion, questions, nextState);
  if (!nextQuestion) {
    return {
      ...replyText(cfg.finalMessage),
      nextStep: "idle",
      leadPatch: answered.leadPatch,
      convoDataPatch: nextState,
      completed: true
    };
  }

  return {
    ...questionPrompt(nextQuestion),
    nextStep: nextQuestion.id,
    leadPatch: answered.leadPatch,
    convoDataPatch: { ...nextState, currentQuestionId: nextQuestion.id }
  };
}

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
    const prompt = `${cfg.prompts.welcome}\n\n¿Qué tipo de propiedad buscas?`;
    return { ...replyChoice(prompt, cfg.propertyOptions, "auto"), nextStep: "choose_property" };
  }

  if (convo.step === "choose_property") {
    const opt = (cfg.propertyOptions ?? []).find((o) => o.key === textLower);
    if (!opt) {
      const prompt = `${cfg.prompts.invalidOption}\n\n¿Qué tipo de propiedad buscas?`;
      return { ...replyChoice(prompt, cfg.propertyOptions, "auto"), nextStep: "choose_property" };
    }

    if (cfg.enabledQuestions?.presupuesto) {
      return {
        ...replyText(cfg.prompts.askBudget ?? "¿Cuál es tu presupuesto aproximado?"),
        nextStep: "ask_budget",
        leadPatch: { interes: opt.value },
        convoDataPatch: { interes: opt.value }
      };
    }

    if (cfg.enabledQuestions?.ubicacion) {
      return {
        ...replyText(cfg.prompts.askLocation ?? "¿En qué ubicación/zona buscas?"),
        nextStep: "ask_location",
        leadPatch: { interes: opt.value },
        convoDataPatch: { interes: opt.value }
      };
    }

    if (cfg.enabledQuestions?.tiempoCompra) {
      return {
        ...replyChoice("¿En qué tiempo planeas comprar?", cfg.timeOptions, "auto"),
        nextStep: "ask_time",
        leadPatch: { interes: opt.value },
        convoDataPatch: { interes: opt.value }
      };
    }

    return {
      ...replyText(cfg.finalMessage ?? "Listo."),
      nextStep: "idle",
      leadPatch: { interes: opt.value },
      convoDataPatch: { interes: opt.value },
      completed: true
    };
  }

  if (convo.step === "ask_budget") {
    if (!text) return { ...replyText(cfg.prompts.askBudget ?? "¿Cuál es tu presupuesto aproximado?"), nextStep: "ask_budget" };

    if (cfg.enabledQuestions?.ubicacion) {
      return {
        ...replyText(cfg.prompts.askLocation ?? "¿En qué ubicación/zona buscas?"),
        nextStep: "ask_location",
        leadPatch: { presupuesto: text },
        convoDataPatch: { presupuesto: text }
      };
    }

    if (cfg.enabledQuestions?.tiempoCompra) {
      return {
        ...replyChoice("¿En qué tiempo planeas comprar?", cfg.timeOptions, "auto"),
        nextStep: "ask_time",
        leadPatch: { presupuesto: text },
        convoDataPatch: { presupuesto: text }
      };
    }

    return {
      ...replyText(cfg.finalMessage ?? "Listo."),
      nextStep: "idle",
      leadPatch: { presupuesto: text },
      convoDataPatch: { presupuesto: text },
      completed: true
    };
  }

  if (convo.step === "ask_location") {
    if (text.length < 2) return { ...replyText(cfg.prompts.askLocation ?? "¿En qué ubicación/zona buscas?"), nextStep: "ask_location" };

    if (cfg.enabledQuestions?.tiempoCompra) {
      return {
        ...replyChoice("¿En qué tiempo planeas comprar?", cfg.timeOptions, "auto"),
        nextStep: "ask_time",
        leadPatch: { ubicacion: text },
        convoDataPatch: { ubicacion: text }
      };
    }

    return {
      ...replyText(cfg.finalMessage ?? "Listo."),
      nextStep: "idle",
      leadPatch: { ubicacion: text },
      convoDataPatch: { ubicacion: text },
      completed: true
    };
  }

  if (convo.step === "ask_time") {
    const opt = (cfg.timeOptions ?? []).find((o) => o.key === textLower);
    const tiempoCompra = opt?.value ?? (text.length >= 2 ? text : "");

    if (!tiempoCompra) {
      return { ...replyChoice("¿En qué tiempo planeas comprar?", cfg.timeOptions, "auto"), nextStep: "ask_time" };
    }

    return {
      ...replyText(cfg.finalMessage ?? "Listo."),
      nextStep: "idle",
      leadPatch: { tiempoCompra },
      convoDataPatch: { tiempoCompra },
      completed: true
    };
  }

  return { type: "noop" };
}

export function handleInboundText(messageText: string, convo: ConversationDoc, companyCfg?: BotFlowConfig): FlowResult {
  const cfg = mergeCfg(companyCfg);

  if (cfg.questions?.length) {
    const builderResult = builderFlow(messageText, convo, cfg);
    if (builderResult.type === "reply") return builderResult;
  }

  if (isReset(messageText)) {
    return { ...replyChoice(`${cfg.prompts.welcome}\n\n¿Qué tipo de propiedad buscas?`, cfg.propertyOptions, "auto"), nextStep: "choose_property" };
  }

  return legacyFlow(messageText, convo, cfg);
}
