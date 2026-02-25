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
      const waId = m?.from;
      const contacts = value?.contacts ?? [];
      const name = contacts?.[0]?.profile?.name;

      // TEXT
      if (m?.type === "text") {
        const text = m?.text?.body ?? "";
        out.push({
          channel: "whatsapp",
          externalUserId: waId,
          phone: waId,
          name,
          text
        });
        continue;
      }

      // INTERACTIVE (button/list reply)
      if (m?.type === "interactive") {
        const interactive = m?.interactive;

        // button_reply: { id, title }
        const br = interactive?.button_reply;
        if (br?.id || br?.title) {
          out.push({
            channel: "whatsapp",
            externalUserId: waId,
            phone: waId,
            name,
            text: String(br.id ?? br.title ?? "")
          });
          continue;
        }

        // list_reply: { id, title, description }
        const lr = interactive?.list_reply;
        if (lr?.id || lr?.title) {
          out.push({
            channel: "whatsapp",
            externalUserId: waId,
            phone: waId,
            name,
            text: String(lr.id ?? lr.title ?? "")
          });
          continue;
        }
      }
    }
  }
}

return out;
}