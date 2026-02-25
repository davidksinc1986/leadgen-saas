import fetch from "node-fetch";
import { ChannelAdapter } from "../types.js";
import { log } from "../../config/logger.js";

export function messengerAdapter(env: any): ChannelAdapter {
const enabled = !!(env.messenger.enabled && env.messenger.pageAccessToken);

return {
  channel: "messenger",
  enabled,
  async sendText(toExternalUserId: string, text: string) {
    if (!enabled) {
      log.warn("[messenger] disabled. Would send to:", toExternalUserId, "text:", text);
      return;
    }

    const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(env.messenger.pageAccessToken)}`;
    const payload = {
      recipient: { id: toExternalUserId },
      message: { text }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`[messenger] send failed: ${resp.status} ${body}`);
    }
  }
};
}