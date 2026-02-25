import { InboundMessage } from "../types.js";

export function parseWhatsAppWebhook(body: any): InboundMessage[] {
const out: InboundMessage[] = [];

const entry = body?.entry ?? [];
for (const e of entry) {
  const changes = e?.changes ?? [];
  for (const c of changes) {
    const value = c?.value;
    const messages = value?.messages ?? [];
    for (const m of messages) {
      if (m?.type !== "text") continue;

      const waId = m?.from;
      const text = m?.text?.body ?? "";
      const contacts = value?.contacts ?? [];
      const name = contacts?.[0]?.profile?.name;

      out.push({
        channel: "whatsapp",
        externalUserId: waId,
        phone: waId,
        name,
        text
      });
    }
  }
}

return out;
}