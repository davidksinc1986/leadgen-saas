import bcrypt from "bcryptjs";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { env } from "./config/env.js";
import { User } from "./models/User.js";

async function ensureSuperAdmin() {
  const email = "davidisinc@gmail.com";
  const password = "M@davi19!";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email, role: "super_admin" });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.systemProtected = true;
    existing.isActive = true;
    existing.name = existing.name || "David Super Admin";
    await existing.save();
    return;
  }

  await User.create({
    email,
    passwordHash,
    role: "super_admin",
    name: "David Super Admin",
    systemProtected: true,
    isActive: true
  });

  console.log(`[seed] super admin created: ${email}`);
}

async function main() {
  await connectMongo();
  await ensureSuperAdmin();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] listening on :${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
