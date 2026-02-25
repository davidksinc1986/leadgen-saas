export type InboundMessage = {
channel: "whatsapp" | "messenger" | "instagram" | "webchat";
externalUserId: string;
phone?: string;
name?: string;
text: string; // para choices: aquí llega "1" o "q_xxx" etc (lo que decidas)
};

export type ChoiceOption = {
id: string;        // se manda como reply.id (ej: "1")
title: string;     // texto visible
description?: string;
};

export type OutboundMessage =
| { kind: "text"; text: string }
| { kind: "choice"; text: string; options: ChoiceOption[]; ui?: "auto" | "buttons" | "list"; listButtonText?: string };

export interface ChannelAdapter {
channel: InboundMessage["channel"];
enabled: boolean;

sendText(toExternalUserId: string, text: string): Promise<void>;

// opcional: si no está implementado, hacemos fallback a texto
sendChoice?: (toExternalUserId: string, msg: Extract<OutboundMessage, { kind: "choice" }>) => Promise<void>;
}