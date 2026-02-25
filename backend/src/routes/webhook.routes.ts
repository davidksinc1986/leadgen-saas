import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";

import { parseWhatsAppWebhook } from "../channels/whatsapp/whatsapp.webhook.js";
import { parseMessengerWebhook } from "../channels/messenger/messenger.webhook.js";
import { parseInstagramWebhook } from "../channels/instagram/instagram.webhook.js";
import { parseWebchat } from "../channels/webchat/webchat.webhook.js";

import { getOrCreateConversation } from "../services/conversation.service.js";
import { upsertLeadByPhone } from "../services/lead.service.js";
import { handleInboundText } from "../services/flow.service.js";

import { Lead } from "../models/Lead.js";
import { assignAgentRoundRobin } from "../services/assignment.service.js";
import { notifyLeadQualified } from "../services/notify.service.js";
import { Company } from "../models/Company.js";

import { Integration } from "../models/Integration.js";
import { verifyMetaSignature } from "../middleware/metaSignature.js";
import { whatsappAdapterFromIntegration } from "../channels/whatsapp/whatsapp.adapter.js";

export const webhookRouter = Router();

function parseByChannel(channel: string, body: any) {
switch (channel) {
  case "whatsapp":
    return parseWhatsAppWebhook(body);
  case "messenger":
    return parseMessengerWebhook(body);
  case "instagram":
    return parseInstagramWebhook(body);
  case "webchat":
    return parseWebchat(body);
  default:
    return [];
}
}

// --------- META (multi-tenant sin headers) ---------

webhookRouter.get("/:channel/:integrationId", async (req, res) => {
const channel = req.params.channel;
const integrationId = req.params.integrationId;

const mode = req.query["hub.mode"];
const token = req.query["hub.verify_token"];
const challenge = req.query["hub.challenge"];

if (mode !== "subscribe") return res.status(400).send("Bad Request");
if (!mongoose.isValidObjectId(integrationId)) return res.status(400).send("Bad integrationId");

const integration = await Integration.findById(integrationId);
if (!integration) return res.status(404).send("Not found");
if (integration.channel !== channel) return res.status(400).send("Channel mismatch");

if (!integration.verifyToken || token !== integration.verifyToken) return res.status(403).send("Forbidden");
return res.status(200).send(challenge);
});

async function attachIntegration(req: any, _res: any, next: any) {
const integrationId = req.params.integrationId;
if (mongoose.isValidObjectId(integrationId)) {
  req._integration = await Integration.findById(integrationId);
}
next();
}

function maybeVerifySignature(req: any, res: any, next: any) {
const required = (process.env.META_SIGNATURE_REQUIRED ?? "true") === "true";
if (!required) return next(); // <- aquí respeta META_SIGNATURE_REQUIRED=false

const integration = req._integration;
if (!integration) return res.status(404).json({ error: "Integration not found" });

return verifyMetaSignature((r) => (r as any)._integration?.appSecretEnc ?? "")(req, res, next);
}

webhookRouter.post("/:channel/:integrationId", attachIntegration, maybeVerifySignature, async (req: any, res) => {
const channel = req.params.channel;
const integrationId = req.params.integrationId;

if (!mongoose.isValidObjectId(integrationId)) return res.status(400).json({ error: "Bad integrationId" });

const integration = req._integration;
if (!integration) return res.status(404).json({ error: "Integration not found" });
if (integration.channel !== channel) return res.status(400).json({ error: "Channel mismatch" });

const companyId = new mongoose.Types.ObjectId(String(integration.companyId));
const company = await Company.findById(companyId).select("botFlow notifications");
const botFlow = (company as any)?.botFlow ?? undefined;

const inbound = parseByChannel(channel, req.body);

// 200 rápido
res.status(200).json({ ok: true, received: inbound.length });

const adapter = channel === "whatsapp" ? whatsappAdapterFromIntegration(integration) : null;

for (const msg of inbound) {
  const convo = await getOrCreateConversation({
    companyId,
    channel: msg.channel,
    externalUserId: msg.externalUserId,
    telefono: msg.phone
  });

  if (msg.phone) {
    await upsertLeadByPhone({
      companyId,
      telefono: msg.phone,
      source: msg.channel,
      nombre: msg.name
    });
  }

  const result = handleInboundText(msg.text, convo, botFlow);
  if (result.type !== "reply") continue;

  if (result.convoDataPatch) {
    convo.data = { ...(convo.data ?? {}), ...(result.convoDataPatch ?? {}) };
  }
  if (result.nextStep) convo.step = result.nextStep;
  await convo.save();

  if (msg.phone) {
    let updatedLead: any = null;
    const hasPatch = !!(result.leadPatch && Object.keys(result.leadPatch).length);

    if (hasPatch) {
      updatedLead = await Lead.findOneAndUpdate(
        { companyId, telefono: msg.phone },
        { $set: { ...result.leadPatch, lastMessageAt: new Date() } },
        { new: true }
      );
    } else {
      updatedLead = await Lead.findOne({ companyId, telefono: msg.phone });
      if (updatedLead) {
        updatedLead.lastMessageAt = new Date();
        await updatedLead.save();
      }
    }

    if (updatedLead && result.completed) {
      if (!updatedLead.qualifiedAt) updatedLead.qualifiedAt = new Date();

      let agentName: string | undefined;
      if (!updatedLead.assignedAgentId) {
        const agent = await assignAgentRoundRobin(companyId);
        if (agent) {
          updatedLead.assignedAgentId = agent._id;
          agentName = agent.name || agent.email;
        }
      }

      await updatedLead.save();
      await notifyLeadQualified({ companyId: String(companyId), lead: updatedLead, agentName });
    }
  }

  if (adapter?.enabled) {
    await adapter.sendText(msg.externalUserId, result.text);
  }
}
});

// --------- MVP (webchat + header) ---------
webhookRouter.post("/:channel", async (req, res) => {
const channel = req.params.channel;

const companyIdRaw = req.header(env.tenantHeader);
if (!companyIdRaw || !mongoose.isValidObjectId(companyIdRaw)) {
  return res.status(400).json({ error: `Missing/invalid ${env.tenantHeader}` });
}
const companyId = new mongoose.Types.ObjectId(companyIdRaw);

const company = await Company.findById(companyId).select("botFlow");
const botFlow = (company as any)?.botFlow ?? undefined;

const inbound = parseByChannel(channel, req.body);
res.status(200).json({ ok: true, received: inbound.length });

for (const msg of inbound) {
  const convo = await getOrCreateConversation({
    companyId,
    channel: msg.channel,
    externalUserId: msg.externalUserId,
    telefono: msg.phone
  });

  if (msg.phone) {
    await upsertLeadByPhone({
      companyId,
      telefono: msg.phone,
      source: msg.channel,
      nombre: msg.name
    });
  }

  const result = handleInboundText(msg.text, convo, botFlow);
  if (result.type !== "reply") continue;

  if (result.convoDataPatch) convo.data = { ...(convo.data ?? {}), ...(result.convoDataPatch ?? {}) };
  if (result.nextStep) convo.step = result.nextStep;
  await convo.save();
}
});