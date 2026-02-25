import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { Company } from "../models/Company.js";
import { handleInboundText } from "../services/flow.service.js";

export const companyBotFlowRouter = Router();

const optionSchema = z.object({
 key: z.string().min(1),
 label: z.string().min(1),
 value: z.string().min(1)
});

const conditionSchema = z.object({
 path: z.string().min(1),
 op: z.enum(["equals", "notEquals", "contains", "in", "gt", "gte", "lt", "lte", "exists", "regex"]),
 value: z.any().optional()
});

const nextRuleSchema = z.object({
 conditions: z.array(conditionSchema).default([]),
 nextId: z.string().min(1)
});

const questionSchema = z.object({
 id: z
   .string()
   .min(2)
   .regex(/^q_[a-z0-9_]+$/, "Question id must look like q_interes, q_presupuesto, etc."),
 type: z.enum(["choice", "text", "number"]),
 prompt: z.string().min(1),
 required: z.boolean().optional().default(true),

 saveTo: z
   .string()
   .min(1)
   .refine(
     (s) =>
       ["nombre", "interes", "presupuesto", "ubicacion", "tiempoCompra"].includes(s) ||
       s.startsWith("customFields."),
     "saveTo must be a standard lead field or start with customFields."
   ),

 options: z.array(optionSchema).optional().default([]),
 showIf: z.array(conditionSchema).optional().default([]),

 next: z
   .object({
     defaultNextId: z.string().nullable().optional().default(null),
     rules: z.array(nextRuleSchema).optional().default([])
   })
   .optional()
   .default({ defaultNextId: null, rules: [] })
});

function ensureArray(v: any): any[] {
 return Array.isArray(v) ? v : [];
}

function validateQuestionGraph(questions: any[]) {
 const ids = new Set<string>(questions.map((q) => String(q.id)));
 const errors: string[] = [];

 for (const q of questions) {
   const defaultNextId = q?.next?.defaultNextId;
   if (defaultNextId && !ids.has(String(defaultNextId))) {
     errors.push(`Question ${q.id}: next.defaultNextId '${defaultNextId}' does not exist`);
   }

   const rules = ensureArray(q?.next?.rules);
   for (const r of rules as any[]) {
     const nextId = (r as any)?.nextId;
     if (nextId && !ids.has(String(nextId))) {
       errors.push(`Question ${q.id}: next.rules nextId '${nextId}' does not exist`);
     }
   }

   if (q.type === "choice" && (!q.options || q.options.length === 0)) {
     errors.push(`Question ${q.id}: choice requires options[]`);
   }
 }

 return errors;
}

/**
* GET bot flow
*/
companyBotFlowRouter.get("/me/bot-flow", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const company = await Company.findById(companyId).select("botFlow");
 res.json({ botFlow: (company as any)?.botFlow ?? null });
});

/**
* PATCH bot flow (settings generales)
*/
companyBotFlowRouter.patch("/me/bot-flow", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;

 const schema = z.object({
   enabledQuestions: z
     .object({
       presupuesto: z.boolean().optional(),
       ubicacion: z.boolean().optional(),
       tiempoCompra: z.boolean().optional()
     })
     .optional(),
   prompts: z
     .object({
       welcome: z.string().min(1).optional(),
       askPropertyType: z.string().min(1).optional(),
       askBudget: z.string().min(1).optional(),
       askLocation: z.string().min(1).optional(),
       askTime: z.string().min(1).optional(),
       invalidOption: z.string().min(1).optional()
     })
     .optional(),
   propertyOptions: z.array(optionSchema).optional(),
   timeOptions: z.array(optionSchema).optional(),
   finalMessage: z.string().min(1).optional()
 });

 const body = schema.parse(req.body);

 const company = await Company.findById(companyId);
 if (!company) return res.status(404).json({ error: "Company not found" });

 const current = (company as any).botFlow ?? {};
 (company as any).botFlow = {
   ...current,
   ...body,
   enabledQuestions: { ...(current.enabledQuestions ?? {}), ...(body.enabledQuestions ?? {}) },
   prompts: { ...(current.prompts ?? {}), ...(body.prompts ?? {}) }
 };

 await company.save();
 res.json({ botFlow: (company as any).botFlow });
});

/**
* PREVIEW: simula una interacción sin tocar leads ni conversations
* body: { step?: string, data?: any, text: string }
*/
companyBotFlowRouter.post("/me/bot-flow/preview", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const schema = z.object({
   step: z.string().optional().default("idle"),
   data: z.any().optional().default({}),
   text: z.string().min(1)
 });

 const body = schema.parse(req.body);

 const company = await Company.findById(companyId).select("botFlow");
 const botFlow = (company as any)?.botFlow ?? undefined;

 const fakeConvo = { step: body.step, data: body.data } as any;
 const result = handleInboundText(body.text, fakeConvo, botFlow);

 const mergedData = { ...(body.data ?? {}), ...((result as any).convoDataPatch ?? {}) };
 res.json({ result, mergedData });
});

/**
* POST add question
*/
companyBotFlowRouter.post("/me/bot-flow/questions", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;

 const schema = z.object({
   question: questionSchema,
   position: z.number().int().min(0).optional()
 });

 const { question, position } = schema.parse(req.body);

 const company = await Company.findById(companyId);
 if (!company) return res.status(404).json({ error: "Company not found" });

 const botFlow = ((company as any).botFlow ??= {});
 const questions = (botFlow.questions = ensureArray(botFlow.questions));

 if (questions.some((q: any) => q.id === question.id)) {
   return res.status(409).json({ error: `Question id already exists: ${question.id}` });
 }

 if (position === undefined || position >= questions.length) questions.push(question);
 else questions.splice(position, 0, question);

 const graphErrors = validateQuestionGraph(questions);
 if (graphErrors.length) return res.status(400).json({ error: "Invalid botFlow", details: graphErrors });

 await company.save();
 res.json({ questions: botFlow.questions });
});

/**
* PATCH update question by id
*/
companyBotFlowRouter.patch("/me/bot-flow/questions/:id", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const id = req.params.id;

 const patchSchema = z.object({
   type: z.enum(["choice", "text", "number"]).optional(),
   prompt: z.string().min(1).optional(),
   required: z.boolean().optional(),
   saveTo: z
     .string()
     .min(1)
     .optional()
     .refine((s) => {
       if (!s) return true; // <- fix TS: optional field
       return ["nombre", "interes", "presupuesto", "ubicacion", "tiempoCompra"].includes(s) || s.startsWith("customFields.");
     }, "saveTo must be a standard lead field or start with customFields."),
   options: z.array(optionSchema).optional(),
   showIf: z.array(conditionSchema).optional(),
   next: z
     .object({
       defaultNextId: z.string().nullable().optional(),
       rules: z.array(nextRuleSchema).optional()
     })
     .optional()
 });

 const patch = patchSchema.parse(req.body) as any;

 const company = await Company.findById(companyId);
 if (!company) return res.status(404).json({ error: "Company not found" });

 const botFlow = ((company as any).botFlow ??= {});
 const questions = (botFlow.questions = ensureArray(botFlow.questions));

 const idx = questions.findIndex((q: any) => q.id === id);
 if (idx === -1) return res.status(404).json({ error: "Question not found" });

 const updated = { ...(questions[idx] as any), ...(patch as any), id };

 if (updated.type === "choice" && (!updated.options || updated.options.length === 0)) {
   return res.status(400).json({ error: "choice question requires options[]" });
 }

 questions[idx] = updated;

 const graphErrors = validateQuestionGraph(questions);
 if (graphErrors.length) return res.status(400).json({ error: "Invalid botFlow", details: graphErrors });

 await company.save();
 res.json({ question: questions[idx], questions });
});

/**
* MOVE question (reorder)
*/
companyBotFlowRouter.post("/me/bot-flow/questions/:id/move", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const id = req.params.id;

 const body = z.object({ toIndex: z.number().int().min(0) }).parse(req.body);

 const company = await Company.findById(companyId);
 if (!company) return res.status(404).json({ error: "Company not found" });

 const botFlow = ((company as any).botFlow ??= {});
 const questions = (botFlow.questions = ensureArray(botFlow.questions));

 const from = questions.findIndex((q: any) => q.id === id);
 if (from === -1) return res.status(404).json({ error: "Question not found" });

 const to = Math.min(body.toIndex, Math.max(questions.length - 1, 0));
 const [item] = questions.splice(from, 1);
 questions.splice(to, 0, item);

 await company.save();
 res.json({ questions });
});

/**
* DELETE question
*/
companyBotFlowRouter.delete("/me/bot-flow/questions/:id", requireAuth, requireRole("admin"), async (req, res) => {
 const companyId = req.companyId!;
 const id = req.params.id;

 const company = await Company.findById(companyId);
 if (!company) return res.status(404).json({ error: "Company not found" });

 const botFlow = ((company as any).botFlow ??= {});
 const questions = (botFlow.questions = ensureArray(botFlow.questions));

 const before = questions.length;
 botFlow.questions = questions.filter((q: any) => q.id !== id);

 if (botFlow.questions.length === before) return res.status(404).json({ error: "Question not found" });

 const graphErrors = validateQuestionGraph(botFlow.questions);
 if (graphErrors.length) return res.status(400).json({ error: "Invalid botFlow", details: graphErrors });

 await company.save();
 res.json({ questions: botFlow.questions });
});