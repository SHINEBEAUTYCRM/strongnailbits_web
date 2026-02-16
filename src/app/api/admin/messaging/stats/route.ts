/**
 * API: Messaging delivery stats
 *
 * GET /api/admin/messaging/stats — delivery statistics
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // Total messages
  const { count: totalMessages } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true });

  // Messages by channel
  const { count: telegramCount } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("channel", "telegram");

  const { count: smsCount } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("channel", "sms");

  // Success rate
  const { count: sentCount } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: failedCount } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");

  // Clients with Telegram
  const { count: telegramClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("telegram_chat_id", "is", null);

  // Total clients
  const { count: totalClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Pending scheduled
  const { count: pendingScheduled } = await supabase
    .from("scheduled_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Recent messages (last 20)
  const { data: recentMessages } = await supabase
    .from("message_log")
    .select(`
      id,
      channel,
      phone,
      telegram_chat_id,
      rendered_text,
      status,
      error,
      cost,
      sent_at,
      profiles (
        first_name,
        last_name,
        phone
      )
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  // SMS cost (total)
  const { data: costData } = await supabase
    .from("message_log")
    .select("cost")
    .eq("channel", "sms")
    .eq("status", "sent");

  const totalSmsCost = (costData || []).reduce(
    (sum, r) => sum + (Number(r.cost) || 0),
    0,
  );

  return NextResponse.json({
    data: {
      totalMessages: totalMessages || 0,
      telegramMessages: telegramCount || 0,
      smsMessages: smsCount || 0,
      sentCount: sentCount || 0,
      failedCount: failedCount || 0,
      successRate:
        (totalMessages || 0) > 0
          ? (((sentCount || 0) / (totalMessages || 1)) * 100).toFixed(1)
          : "0",
      telegramClients: telegramClients || 0,
      totalClients: totalClients || 0,
      telegramCoverage:
        (totalClients || 0) > 0
          ? (((telegramClients || 0) / (totalClients || 1)) * 100).toFixed(1)
          : "0",
      pendingScheduled: pendingScheduled || 0,
      totalSmsCost: totalSmsCost.toFixed(2),
      recentMessages: recentMessages || [],
    },
  });
}
