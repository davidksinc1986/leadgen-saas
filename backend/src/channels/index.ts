import { env } from "../config/env.js";
import { ChannelAdapter } from "./types.js";
import { whatsappAdapter } from "./whatsapp/whatsapp.adapter.js";
import { messengerAdapter } from "./messenger/messenger.adapter.js";
import { instagramAdapter } from "./instagram/instagram.adapter.js";
import { webchatAdapter } from "./webchat/webchat.adapter.js";

export function getAdapters(): Record<string, ChannelAdapter> {
return {
  whatsapp: whatsappAdapter(env),
  messenger: messengerAdapter(env),
  instagram: instagramAdapter(env),
  webchat: webchatAdapter()
};
}