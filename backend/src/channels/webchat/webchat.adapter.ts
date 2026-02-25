import { ChannelAdapter } from "../types.js";
import { log } from "../../config/logger.js";

export function webchatAdapter(): ChannelAdapter {
return {
  channel: "webchat",
  enabled: true,
  async sendText(toExternalUserId: string, text: string) {
    log.info("[webchat] to session:", toExternalUserId, "text:", text);
  }
};
}