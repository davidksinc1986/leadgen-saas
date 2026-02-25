import dotenv from "dotenv";
dotenv.config();

export const env = {
nodeEnv: process.env.NODE_ENV ?? "development",
port: Number(process.env.PORT ?? 4000),
mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/realestate_saas",
jwtSecret: process.env.JWT_SECRET ?? "change_me",
jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
tenantHeader: process.env.TENANT_HEADER ?? "X-Company-Id",

whatsapp: {
  enabled: (process.env.WHATSAPP_ENABLED ?? "false") === "true",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? ""
},
messenger: {
  enabled: (process.env.MESSENGER_ENABLED ?? "false") === "true",
  pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "",
  verifyToken: process.env.MESSENGER_VERIFY_TOKEN ?? ""
},
instagram: {
  enabled: (process.env.INSTAGRAM_ENABLED ?? "false") === "true",
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
  verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN ?? ""
}
};
