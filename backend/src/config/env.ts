import dotenv from "dotenv";
dotenv.config();

function asBool(value: string | undefined, defaultValue = false) {
  if (value == null) return defaultValue;
  return value.toLowerCase() === "true";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/leadgen_saas",
  jwtSecret: process.env.JWT_SECRET ?? "change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  tenantHeader: process.env.TENANT_HEADER ?? "X-Company-Id",

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? "",
    password: process.env.SUPER_ADMIN_PASSWORD ?? "",
    name: process.env.SUPER_ADMIN_NAME ?? "Super Admin"
  },

  bootstrap: {
    enabled: asBool(process.env.BOOTSTRAP_COMPANY_ENABLED, false),
    companyName: process.env.BOOTSTRAP_COMPANY_NAME ?? "Narrow Path Events",
    companySlug: process.env.BOOTSTRAP_COMPANY_SLUG ?? "narrow-path-events",
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "",
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "",
    adminName: process.env.BOOTSTRAP_ADMIN_NAME ?? "Company Admin"
  },

  whatsapp: {
    enabled: asBool(process.env.WHATSAPP_ENABLED),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? ""
  },
  messenger: {
    enabled: asBool(process.env.MESSENGER_ENABLED),
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "",
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN ?? ""
  },
  instagram: {
    enabled: asBool(process.env.INSTAGRAM_ENABLED),
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN ?? ""
  }
};
