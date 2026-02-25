import { InboundMessage } from "../types.js";

export function parseMessengerWebhook(body: any): InboundMessage[] {
const out: InboundMessage[] = [];
const entry = body?.entry ?? [];

for (const e of entry) {
  const messaging = e?.messaging ?? [];
  for (const m of messaging) {
    const senderId = m?.sender?.id;
    const text = m?.message?.text;
    if (!senderId || !text) continue;

    out.push({
      channel: "messenger",
      externalUserId: senderId,
      text
    });
  }
}
return out;
}