import { ChannelAdapter } from "../types.js";
import { log } from "../../config/logger.js";

export function instagramAdapter(env: any): ChannelAdapter {
const enabled = !!(env.instagram.enabled && env.instagram.accessToken);

return {
  channel: "instagram",
  enabled,
  async sendText(toExternalUserId: string, text: string) {
    if (!enabled) {
      log.warn("[instagram] disabled. Would send to:", toExternalUserId, "text:", text);
      return;
    }
    log.warn("[instagram] enabled but not implemented yet. to:", toExternalUserId, "text:", text);
  }
};
}