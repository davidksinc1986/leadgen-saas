import fetch from "node-fetch";
import { ChannelAdapter, OutboundMessage } from "../types.js";
import { log } from "../../config/logger.js";
import { decrypt } from "../../utils/crypto.js";

async function sendWhatsAppPayload(params: { phoneNumberId: string; accessToken: string; payload: any }) {
const { phoneNumberId, accessToken, payload } = params;
const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

const resp = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

if (!resp.ok) {
  const body = await resp.text();
  throw new Error(`[whatsapp] send failed: ${resp.status} ${body}`);
}
}

// MODO ANTIGUO (env)
export function whatsappAdapter(env: any): ChannelAdapter {
const enabled = !!(env?.whatsapp?.enabled && env?.whatsapp?.phoneNumberId && env?.whatsapp?.accessToken);

return {
  channel: "whatsapp",
  enabled,

  async sendText(toExternalUserId: string, text: string) {
    if (!enabled) {
      log.warn("[whatsapp] disabled (env). Would send to:", toExternalUserId, "text:", text);
      return;
    }

    await sendWhatsAppPayload({
      phoneNumberId: env.whatsapp.phoneNumberId,
      accessToken: env.whatsapp.accessToken,
      payload: {
        messaging_product: "whatsapp",
        to: toExternalUserId,
        type: "text",
        text: { body: text }
      }
    });
  },

  async sendChoice(toExternalUserId: string, msg) {
    if (!enabled) {
      log.warn("[whatsapp] disabled (env). Would send choice to:", toExternalUserId, msg);
      return;
    }
    await sendChoiceImpl(env.whatsapp.phoneNumberId, env.whatsapp.accessToken, toExternalUserId, msg);
  }
};
}

// MODO NUEVO (Integration)
export function whatsappAdapterFromIntegration(integration: any): ChannelAdapter {
const phoneNumberId = integration?.meta?.phoneNumberId ?? "";
const accessToken = decrypt(integration?.accessTokenEnc ?? "");
const enabled = !!(integration?.enabled && phoneNumberId && accessToken);

return {
  channel: "whatsapp",
  enabled,

  async sendText(toExternalUserId: string, text: string) {
    if (!enabled) {
      log.warn("[whatsapp] disabled (integration). Would send to:", toExternalUserId, "text:", text);
      return;
    }

    await sendWhatsAppPayload({
      phoneNumberId,
      accessToken,
      payload: {
        messaging_product: "whatsapp",
        to: toExternalUserId,
        type: "text",
        text: { body: text }
      }
    });
  },

  async sendChoice(toExternalUserId: string, msg) {
    if (!enabled) {
      log.warn("[whatsapp] disabled (integration). Would send choice to:", toExternalUserId, msg);
      return;
    }
    await sendChoiceImpl(phoneNumberId, accessToken, toExternalUserId, msg);
  }
};
}

async function sendChoiceImpl(
phoneNumberId: string,
accessToken: string,
toExternalUserId: string,
msg: Extract<OutboundMessage, { kind: "choice" }>
) {
const ui = msg.ui ?? "auto";
const options = msg.options ?? [];

const wantButtons = ui === "buttons" || (ui === "auto" && options.length > 0 && options.length <= 3);
const wantList = ui === "list" || (ui === "auto" && options.length >= 4);

if (wantButtons) {
  const buttons = options.slice(0, 3).map((o) => ({
    type: "reply",
    reply: { id: o.id, title: o.title.slice(0, 20) } // WA limita title
  }));

  return sendWhatsAppPayload({
    phoneNumberId,
    accessToken,
    payload: {
      messaging_product: "whatsapp",
      to: toExternalUserId,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: msg.text.slice(0, 1024) },
        action: { buttons }
      }
    }
  });
}

if (wantList) {
  const rows = options.slice(0, 10).map((o) => ({
    id: o.id,
    title: o.title.slice(0, 24),
    description: (o.description ?? "").slice(0, 72)
  }));

  return sendWhatsAppPayload({
    phoneNumberId,
    accessToken,
    payload: {
      messaging_product: "whatsapp",
      to: toExternalUserId,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: msg.text.slice(0, 1024) },
        action: {
          button: (msg.listButtonText ?? "Ver opciones").slice(0, 20),
          sections: [{ title: "Opciones", rows }]
        }
      }
    }
  });
}

// fallback texto
const text =
  msg.text +
  "\n" +
  options.map((o) => `${o.id} ${o.title}`).join("\n");

return sendWhatsAppPayload({
  phoneNumberId,
  accessToken,
  payload: {
    messaging_product: "whatsapp",
    to: toExternalUserId,
    type: "text",
    text: { body: text.slice(0, 4096) }
  }
});
}