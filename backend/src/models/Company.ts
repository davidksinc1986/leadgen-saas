import mongoose from "mongoose";

const BotOptionSchema = new mongoose.Schema(
{
  key: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, required: true }
},
{ _id: false }
);

const ConditionSchema = new mongoose.Schema(
{
  path: { type: String, required: true }, // ej: "answers.q_interes.value"
  op: {
    type: String,
    enum: ["equals", "notEquals", "contains", "in", "gt", "gte", "lt", "lte", "exists", "regex"],
    required: true
  },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
},
{ _id: false }
);

const NextRuleSchema = new mongoose.Schema(
{
  conditions: { type: [ConditionSchema], default: [] },
  nextId: { type: String, required: true }
},
{ _id: false }
);

const QuestionSchema = new mongoose.Schema(
{
  id: { type: String, required: true }, // uuid o slug
  type: { type: String, enum: ["choice", "text", "number"], required: true },
  prompt: { type: String, required: true },
  required: { type: Boolean, default: true },

  // a dónde guardar: "presupuesto" | "ubicacion" | "tiempoCompra" | "interes" | "nombre" | "customFields.habitaciones"
  saveTo: { type: String, required: true },

  options: { type: [BotOptionSchema], default: [] }, // para choice

  // si no cumple showIf => se salta
  showIf: { type: [ConditionSchema], default: [] },

  // reglas de salto
  next: {
    defaultNextId: { type: String, default: null },
    rules: { type: [NextRuleSchema], default: [] }
  }
},
{ _id: false }
);

const BotFlowSchema = new mongoose.Schema(
{
  // compatibilidad con tu flujo anterior (toggles/prompts)
  enabledQuestions: {
    presupuesto: { type: Boolean, default: true },
    ubicacion: { type: Boolean, default: true },
    tiempoCompra: { type: Boolean, default: true }
  },
  prompts: {
    welcome: { type: String, default: "Hola, soy el asistente virtual." },
    askPropertyType: {
      type: String,
      default: "¿Qué tipo de propiedad buscas?\n1 Casa\n2 Apartamento\n3 Lote\n4 Comercial"
    },
    askBudget: {
      type: String,
      default: '¿Cuál es tu presupuesto aproximado? (ej: 250.000.000 o "hasta 250M")'
    },
    askLocation: { type: String, default: "¿En qué ubicación/zona buscas? (ciudad, barrio o sector)" },
    askTime: {
      type: String,
      default: "¿En qué tiempo planeas comprar?\n1 Inmediato (0-1 mes)\n2 1-3 meses\n3 3-6 meses\n4 6+ meses"
    },
    invalidOption: { type: String, default: "Por favor responde con una opción válida." }
  },
  propertyOptions: { type: [BotOptionSchema], default: [] },
  timeOptions: { type: [BotOptionSchema], default: [] },

  // NUEVO: builder dinámico (si existe y tiene elementos, se usa en vez del flujo viejo)
  questions: { type: [QuestionSchema], default: [] },

  finalMessage: { type: String, default: "¡Listo! Ya tengo tu información. Un asesor te contactará pronto." }
},
{ _id: false }
);

const CompanySchema = new mongoose.Schema(
{
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },

  integrations: {
    whatsapp: { enabled: { type: Boolean, default: false } },
    messenger: { enabled: { type: Boolean, default: false } },
    instagram: { enabled: { type: Boolean, default: false } }
  },

  notifications: {
    email: { enabled: { type: Boolean, default: false }, to: { type: [String], default: [] } },
    whatsapp: { enabled: { type: Boolean, default: false }, to: { type: [String], default: [] } }
  },

  leadRouting: {
    strategy: { type: String, enum: ["round_robin"], default: "round_robin" }
  },

  botFlow: { type: BotFlowSchema, default: () => ({}) }
},
{ timestamps: true }
);

export const Company = mongoose.model("Company", CompanySchema);
export type CompanyDoc = mongoose.InferSchemaType<typeof CompanySchema> & { _id: mongoose.Types.ObjectId };
