import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { env } from "./config/env.js";

async function main() {
await connectMongo();
const app = createApp();
app.listen(env.port, () => {
  console.log(`[server] listening on :${env.port}`);
});
}

main().catch((err) => {
console.error(err);
process.exit(1);
});