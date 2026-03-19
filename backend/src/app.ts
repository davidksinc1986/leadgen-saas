import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { tenantResolver } from "./middleware/tenantResolver.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { authRouter } from "./routes/auth.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import { leadRouter } from "./routes/lead.routes.js";
import { campaignRouter } from "./routes/campaign.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";

import { agentRouter } from "./routes/agent.routes.js";
import { companySettingsRouter } from "./routes/company.settings.routes.js";
import { companyBotFlowRouter } from "./routes/company.botflow.routes.js";
import { companyUsersRouter } from "./routes/company.users.routes.js";

import { integrationRouter } from "./routes/integration.routes.js";
import { appointmentRouter } from "./routes/appointment.routes.js";
import { superAdminRouter } from "./routes/super.admin.routes.js";

export function createApp() {
 const app = express();

 app.use(cors({ origin: env.corsOrigins, credentials: true }));

 // Capturar rawBody para firmas Meta
 app.use(
   express.json({
     limit: "2mb",
     verify: (req: any, _res, buf) => {
       req.rawBody = buf;
     }
   })
 );

 app.use(morgan("dev"));
 app.use(tenantResolver);

 app.get("/health", (_req, res) => res.json({ ok: true }));

 app.use("/auth", authRouter);
 app.use("/companies", companyRouter);
 app.use("/company", companySettingsRouter);
 app.use("/company", companyBotFlowRouter);
 app.use("/company", companyUsersRouter);

 app.use("/agents", agentRouter);
 app.use("/integrations", integrationRouter);
 app.use("/appointments", appointmentRouter);

 app.use("/leads", leadRouter);
 app.use("/campaigns", campaignRouter);
 app.use("/analytics", analyticsRouter);
 app.use("/webhooks", webhookRouter);
 app.use("/super", superAdminRouter);

 app.use(errorHandler);
 return app;
}