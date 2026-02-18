/**
 * Test Telegram Admin Bot connectivity
 *
 * Usage: npx tsx scripts/test-telegram.ts
 */

import { readFileSync } from "fs";

// Load .env.local manually (no dotenv dependency)
try {
  const envFile = readFileSync(".env.local", "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.warn("⚠️  Could not read .env.local — using existing env vars");
}

const TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;

async function test() {
  console.log("🔍 Telegram Admin Bot Diagnostics\n");

  // 1. Check token exists
  console.log("Token exists:", !!TOKEN);
  if (!TOKEN) {
    console.error("❌ TELEGRAM_ADMIN_BOT_TOKEN is not set in .env.local!");
    return;
  }
  console.log("Token starts with:", TOKEN.substring(0, 10) + "...");

  // 2. getMe — validate token
  const me = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
  const meData = await me.json();
  console.log("\ngetMe:", JSON.stringify(meData, null, 2));

  if (!meData.ok) {
    console.error("❌ TOKEN IS INVALID! Get a new one from @BotFather");
    return;
  }

  console.log(`\n✅ Bot is working: @${meData.result.username}`);

  // 3. Check webhook info
  const info = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const infoData = await info.json();
  console.log("\nWebhook info:", JSON.stringify(infoData, null, 2));

  if (infoData.result.url) {
    console.log(`\n📡 Webhook URL: ${infoData.result.url}`);
    console.log(`   Allowed updates: ${JSON.stringify(infoData.result.allowed_updates)}`);

    if (!infoData.result.allowed_updates?.includes("callback_query")) {
      console.warn("⚠️  WARNING: callback_query is NOT in allowed_updates!");
      console.warn("   Run: npx tsx scripts/setup-webhook.ts to fix");
    }
  } else {
    console.warn("⚠️  No webhook URL set! Run: npx tsx scripts/setup-webhook.ts");
  }
}

test().catch(console.error);
