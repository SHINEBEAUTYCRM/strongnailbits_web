/**
 * Register Telegram webhook for @ShineShopAdminBot
 *
 * Usage: npx tsx scripts/setup-webhook.ts
 *
 * Reads from .env.local:
 *   TELEGRAM_ADMIN_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 *   NEXT_PUBLIC_SITE_URL
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
const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function setup() {
  if (!TOKEN) {
    console.error("❌ TELEGRAM_ADMIN_BOT_TOKEN not found in .env.local");
    process.exit(1);
  }

  console.log("🔧 Setting up webhook for ShineShopAdminBot...\n");

  // 1. Verify bot token
  const meRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
  const meData = await meRes.json();

  if (!meData.ok) {
    console.error("❌ Bot token is INVALID!", meData);
    console.error("   Get a new token from @BotFather");
    process.exit(1);
  }

  console.log(`✅ Bot: @${meData.result.username} (${meData.result.first_name})`);

  // 2. Set webhook
  const webhookUrl = `${DOMAIN}/api/admin/auth/telegram-webhook`;
  console.log(`📡 Webhook URL: ${webhookUrl}`);

  const setRes = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: SECRET || undefined,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const setData = await setRes.json();

  if (!setData.ok) {
    console.error("❌ Failed to set webhook:", setData);
    process.exit(1);
  }

  console.log("✅ Webhook set successfully!\n");

  // 3. Verify webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const infoData = await infoRes.json();

  console.log("📋 Webhook info:");
  console.log(`   URL: ${infoData.result.url}`);
  console.log(`   Has custom certificate: ${infoData.result.has_custom_certificate}`);
  console.log(`   Pending updates: ${infoData.result.pending_update_count}`);
  console.log(`   Allowed updates: ${JSON.stringify(infoData.result.allowed_updates)}`);

  if (infoData.result.last_error_message) {
    console.log(`   ⚠️  Last error: ${infoData.result.last_error_message}`);
    console.log(`   ⚠️  Last error date: ${new Date(infoData.result.last_error_date * 1000).toISOString()}`);
  }

  console.log("\n🎉 Done! The webhook is ready.");
}

setup().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
