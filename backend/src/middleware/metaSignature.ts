import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { decrypt } from "../utils/crypto.js";

// Requiere que el body raw esté disponible (lo resolvemos en app.ts luego).
export function verifyMetaSignature(getAppSecretEnc: (req: Request) => string) {
 return (req: Request, res: Response, next: NextFunction) => {
   const sig = req.header("X-Hub-Signature-256") || "";
   if (!sig.startsWith("sha256=")) return res.status(403).json({ error: "Missing signature" });

   const appSecret = decrypt(getAppSecretEnc(req) || "");
   if (!appSecret) return res.status(403).json({ error: "Missing app secret" });

   const rawBody = (req as any).rawBody as Buffer | undefined;
   if (!rawBody) return res.status(500).json({ error: "rawBody not available" });

   const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
     return res.status(403).json({ error: "Invalid signature" });
   }
   next();
 };
}
