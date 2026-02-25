import { InboundMessage } from "../types.js";

export function parseWebchat(body: any): InboundMessage[] {
if (!body?.sessionId || !body?.text) return [];
return [
  {
    channel: "webchat",
    externalUserId: String(body.sessionId),
    text: String(body.text),
    phone: body.phone ? String(body.phone) : undefined,
    name: body.name ? String(body.name) : undefined
  }
];
}