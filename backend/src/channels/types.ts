export type InboundMessage = {
channel: "whatsapp" | "messenger" | "instagram" | "webchat";
externalUserId: string;
phone?: string;
name?: string;
text: string;
};

export interface ChannelAdapter {
channel: InboundMessage["channel"];
enabled: boolean;
sendText(toExternalUserId: string, text: string): Promise<void>;
}