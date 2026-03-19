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
  saveTo: { type: String, required: true },
  options: { type: [BotOptionSchema], default: [] },
  showIf: { type: [ConditionSchema], default: [] },
  next: {
    defaultNextId: { type: String, default: null },
    rules: { type: [NextRuleSchema], default: [] }
  }
},
{ _id: false }
);

const WeeklyAvailabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    enabled: { type: Boolean, default: true },
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" }
  },
  { _id: false }
);

const BotFlowSchema = new mongoose.Schema(
{
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
  questions: { type: [QuestionSchema], default: [] },
  finalMessage: { type: String, default: "¡Listo! Ya tengo tu información. Un asesor te contactará pronto." }
},
{ _id: false }
);

const CompanySchema = new mongoose.Schema(
{
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },

  branding: {
    logoUrl: { type: String, default: "" },
    appTitle: { type: String, default: "" },
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#0ea5e9" },
    accentColor: { type: String, default: "#db2777" },
    neutralColor: { type: String, default: "#0f172a" },
    themePreset: { type: String, default: "modern-blue" }
  },

  calendarSync: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["none", "google", "outlook", "apple"], default: "none" },
    calendarEmail: { type: String, default: "" },
    syncMode: { type: String, enum: ["two_way", "read_only", "write_only"], default: "two_way" },
    timezone: { type: String, default: "UTC" },
    lastSyncAt: { type: Date, default: null }
  },

  appointmentSettings: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: "UTC" },
    slotDurationMin: { type: Number, default: 30, min: 15, max: 180 },
    bookingNoticeHours: { type: Number, default: 2, min: 0, max: 168 },
    weeklyAvailability: {
      type: [WeeklyAvailabilitySchema],
      default: () => [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, enabled: true, start: "09:00", end: "17:00" }))
    }
  },

  integrations: {
    whatsapp: { enabled: { type: Boolean, default: false }, provider: { type: String, default: "meta" } },
    facebook: { enabled: { type: Boolean, default: false } },
    messenger: { enabled: { type: Boolean, default: false } },
    instagram: { enabled: { type: Boolean, default: false } },
    tiktok: { enabled: { type: Boolean, default: false } },
    elevenLabs: { enabled: { type: Boolean, default: false }, voiceId: { type: String, default: "" }, apiKeyEnc: { type: String, default: "" } },
    salesforce: { enabled: { type: Boolean, default: false }, instanceUrl: { type: String, default: "" }, clientId: { type: String, default: "" }, clientSecretEnc: { type: String, default: "" } }
  },

  limits: {
    maxCompanyAdmins: { type: Number, default: 3 },
    maxAgents: { type: Number, default: 20 }
  },

  leadGoal: { type: String, enum: ["appointment", "lead"], default: "appointment" },

  languages: {
    primary: { type: String, default: "en" },
    enabled: { type: [String], default: ["en", "es", "pt", "fr", "de"] }
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
