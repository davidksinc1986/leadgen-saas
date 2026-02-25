import nodemailer from "nodemailer";
import { log } from "../config/logger.js";
import { Company } from "../models/Company.js";
import { LeadDoc } from "../models/Lead.js";
import { getAdapters } from "../channels/index.js";

function smtpEnabled() {
return (process.env.SMTP_ENABLED ?? "false") === "true";
}

function smtpTransport() {
const port = Number(process.env.SMTP_PORT ?? 587);
const secure = (process.env.SMTP_SECURE ?? "false") === "true";

return nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
});
}

export async function notifyLeadQualified(params: { companyId: string; lead: LeadDoc; agentName?: string }) {
const { companyId, lead, agentName } = params;
const company = await Company.findById(companyId);
if (!company) return;

// asegurar objeto notifications para TS y runtime
(lead as any).notifications = (lead as any).notifications ?? { emailNotifiedAt: null, whatsappNotifiedAt: null };

const msg =
  `Nuevo lead calificado (${company.name})\n\n` +
  `Nombre: ${(lead as any).nombre || "-"}\n` +
  `Tel: ${(lead as any).telefono}\n` +
  `Interés: ${(lead as any).interes || "-"}\n` +
  `Presupuesto: ${(lead as any).presupuesto || "-"}\n` +
  `Ubicación: ${(lead as any).ubicacion || "-"}\n` +
  `Tiempo compra: ${(lead as any).tiempoCompra || "-"}\n` +
  `Estado: ${(lead as any).estado}\n` +
  (agentName ? `Asignado a: ${agentName}\n` : "");

// Email
if ((company as any).notifications?.email?.enabled && !(lead as any).notifications?.emailNotifiedAt) {
  const to = (company as any).notifications.email.to ?? [];
  if (!to.length) {
    log.warn("[notify] email enabled but no recipients configured");
  } else if (!smtpEnabled()) {
    log.warn("[notify] SMTP disabled. Would email to:", to, "\n", msg);
  } else {
    const transporter = smtpTransport();
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@leadgenchat.com",
      to,
      subject: `Nuevo lead calificado - ${company.name}`,
      text: msg
    });
    (lead as any).notifications.emailNotifiedAt = new Date();
    await lead.save();
  }
}

// WhatsApp (safe)
if ((company as any).notifications?.whatsapp?.enabled && !(lead as any).notifications?.whatsappNotifiedAt) {
  const to = (company as any).notifications.whatsapp.to ?? [];
  if (!to.length) {
    log.warn("[notify] whatsapp enabled but no recipients configured");
  } else {
    const wa = getAdapters().whatsapp;
    if (!wa?.enabled) {
      log.warn("[notify] WhatsApp adapter disabled. Would WA to:", to, "\n", msg);
    } else {
      for (const phone of to) {
        await wa.sendText(phone, msg);
      }
      (lead as any).notifications.whatsappNotifiedAt = new Date();
      await lead.save();
    }
  }
}
}