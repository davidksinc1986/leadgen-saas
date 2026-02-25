import nodemailer from "nodemailer";
import { env } from "../config/env.js";
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

const msg =
  `Nuevo lead calificado (${company.name})\n\n` +
  `Nombre: ${lead.nombre || "-"}\n` +
  `Tel: ${lead.telefono}\n` +
  `Interés: ${lead.interes || "-"}\n` +
  `Presupuesto: ${lead.presupuesto || "-"}\n` +
  `Ubicación: ${lead.ubicacion || "-"}\n` +
  `Tiempo compra: ${lead.tiempoCompra || "-"}\n` +
  `Estado: ${lead.estado}\n` +
  (agentName ? `Asignado a: ${agentName}\n` : "");

// Email
if (company.notifications?.email?.enabled && !lead.notifications?.emailNotifiedAt) {
  const to = company.notifications.email.to ?? [];
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
    lead.notifications.emailNotifiedAt = new Date();
    await lead.save();
  }
}

// WhatsApp (a agentes o supervisores)
if (company.notifications?.whatsapp?.enabled && !lead.notifications?.whatsappNotifiedAt) {
  const to = company.notifications.whatsapp.to ?? [];
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
      lead.notifications.whatsappNotifiedAt = new Date();
      await lead.save();
    }
  }
}
}