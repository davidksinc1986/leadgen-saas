import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

function timingSafeEqualStr(a: string, b: string) {
 const ba = Buffer.from(a);
 const bb = Buffer.from(b);
 if (ba.length !== bb.length) return false;
 return crypto.timingSafeEqual(ba, bb);
}

/**
* Verifica X-Hub-Signature-256 con el META_APP_SECRET global.
* Requiere req.rawBody (ya lo capturas en app.ts).
*/
export function verifyMetaSignatureGlobal(req: Request, res: Response, next: NextFunction) {
 const sig = req.header("X-Hub-Signature-256") || "";
 if (!sig.startsWith("sha256=")) return res.status(403).json({ error: "Missing signature" });

 const appSecret = process.env.META_APP_SECRET || "";
 if (!appSecret) return res.status(500).json({ error: "META_APP_SECRET not configured" });

 const rawBody = (req as any).rawBody as Buffer | undefined;
 if (!rawBody) return res.status(500).json({ error: "rawBody not available" });

 const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

 if (!timingSafeEqualStr(sig, expected)) {
   return res.status(403).json({ error: "Invalid signature" });
 }
 next();
}