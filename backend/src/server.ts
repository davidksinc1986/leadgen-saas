import bcrypt from "bcryptjs";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { env } from "./config/env.js";
import { Company } from "./models/Company.js";
import { Lead } from "./models/Lead.js";
import { User } from "./models/User.js";

async function ensureSuperAdmin() {
  const { email, password, name } = env.superAdmin;
  if (!email || !password) {
    console.warn("[seed] SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing; super admin seed skipped");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email, role: "super_admin" });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.systemProtected = true;
    existing.isActive = true;
    existing.name = existing.name || name;
    await existing.save();
    console.log(`[seed] super admin updated: ${email}`);
    return;
  }

  await User.create({
    email,
    passwordHash,
    role: "super_admin",
    name,
    systemProtected: true,
    isActive: true
  });

  console.log(`[seed] super admin created: ${email}`);
}

async function ensureBootstrapCompany() {
  const { enabled, companyName, companySlug, adminEmail, adminPassword, adminName } = env.bootstrap;
  if (!enabled) return;

  if (!adminEmail || !adminPassword) {
    console.warn("[seed] BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD missing; company bootstrap skipped");
    return;
  }

  const company = await Company.findOneAndUpdate(
    { slug: companySlug },
    { $setOnInsert: { name: companyName, slug: companySlug } },
    { upsert: true, new: true }
  );

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existingAdmin = await User.findOne({ companyId: company._id, email: adminEmail });

  if (existingAdmin) {
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.role = "company_admin";
    existingAdmin.name = existingAdmin.name || adminName;
    existingAdmin.isActive = true;
    await existingAdmin.save();
  } else {
    await User.create({
      companyId: company._id,
      email: adminEmail,
      passwordHash,
      role: "company_admin",
      name: adminName,
      isActive: true,
      systemProtected: true
    });
  }

  console.log(`[seed] bootstrap company ready: ${companySlug} (${company._id})`);
}

async function ensureIndexes() {
  await Promise.all([Company.syncIndexes(), User.syncIndexes(), Lead.syncIndexes()]);
  console.log("[mongo] indexes synced");
}

async function main() {
  await connectMongo();
  await ensureIndexes();
  await ensureSuperAdmin();
  await ensureBootstrapCompany();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] listening on :${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
