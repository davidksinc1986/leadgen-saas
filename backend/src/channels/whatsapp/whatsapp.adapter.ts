import fetch from "node-fetch";
import { ChannelAdapter } from "../types.js";
import { log } from "../../config/logger.js";
import { decrypt } from "../../utils/crypto.js";

// MODO ANTIGUO (env-based) — lo usa src/channels/index.ts
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

    const url = `https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: toExternalUserId,
      type: "text",
      text: { body: text }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`[whatsapp] send failed: ${resp.status} ${body}`);
    }
  }
};
}

// MODO NUEVO (multi-tenant) — por Integration en DB
export function whatsappAdapterFromIntegration(integration: any): ChannelAdapter {
const phoneNumberId = integration?.meta?.phoneNumberId ?? "";
const accessToken = decrypt(integration?.accessTokenEnc ?? "");
const enabled = !!(integration?.enabled && phoneNumberId && accessToken);

return {
  channel: "whatsapp",
  enabled,
  async sendText(toExternalUserId: string, text: string) {
    if (!enabled) {
      log.warn("[whatsapp] disabled (per integration). Would send to:", toExternalUserId, "text:", text);
      return;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: toExternalUserId,
      type: "text",
      text: { body: text }
    };

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
};
}