// ================================================================
//  Cron: детекция брошенных корзин (каждые 15 мин)
//  Находит корзины с товарами без оформленного заказа
//  и эмитит события для воронки abandoned-cart
// ================================================================

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/integrations/cron-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackFunnelEvent } from "@/lib/funnels/tracker";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let abandoned2h = 0;
  let abandoned24h = 0;

  try {
    // ── 1. Найти корзины брошенные 2+ часа назад (первое напоминание) ──
    const { data: carts2h } = await supabase
      .from("carts")
      .select("id, profile_id, items, updated_at, abandon_notify_count")
      .not("profile_id", "is", null)
      .lte("updated_at", twoHoursAgo.toISOString())
      .gt("updated_at", twentyFourHoursAgo.toISOString())
      .or("abandon_notify_count.is.null,abandon_notify_count.eq.0")
      .limit(30);

    for (const cart of carts2h || []) {
      // Проверяем что в корзине есть товары
      const items = cart.items as Record<string, unknown>[] | null;
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      // Проверяем нет ли нового заказа у этого профиля за последние 2 часа
      const { data: recentOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("profile_id", cart.profile_id)
        .gte("created_at", twoHoursAgo.toISOString())
        .limit(1);

      if (recentOrder && recentOrder.length > 0) continue;

      // Получаем профиль для телеграма
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, phone, telegram_chat_id")
        .eq("id", cart.profile_id)
        .single();

      if (!profile?.telegram_chat_id) continue;

      // Эмитим событие в движок воронок
      await trackFunnelEvent({
        event: "cart_abandoned",
        profileId: profile.id,
        name: profile.first_name || undefined,
        phone: profile.phone || undefined,
        metadata: {
          cart_items_count: items.length,
          source: "cron_abandoned_carts",
        },
      });

      // Отмечаем что отправили первое уведомление
      await supabase
        .from("carts")
        .update({
          last_abandon_notified_at: now.toISOString(),
          abandon_notify_count: 1,
        })
        .eq("id", cart.id);

      abandoned2h++;
    }

    // ── 2. Найти корзины брошенные 24+ часа назад (второе напоминание) ──
    const { data: carts24h } = await supabase
      .from("carts")
      .select("id, profile_id, items, updated_at, abandon_notify_count")
      .not("profile_id", "is", null)
      .lte("updated_at", twentyFourHoursAgo.toISOString())
      .eq("abandon_notify_count", 1)
      .limit(30);

    for (const cart of carts24h || []) {
      const items = cart.items as Record<string, unknown>[] | null;
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      // Проверяем нет ли заказа за последние 24ч
      const { data: recentOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("profile_id", cart.profile_id)
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .limit(1);

      if (recentOrder && recentOrder.length > 0) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, phone, telegram_chat_id")
        .eq("id", cart.profile_id)
        .single();

      if (!profile?.telegram_chat_id) continue;

      await trackFunnelEvent({
        event: "cart_abandoned_24h",
        profileId: profile.id,
        name: profile.first_name || undefined,
        phone: profile.phone || undefined,
        metadata: {
          cart_items_count: items.length,
          source: "cron_abandoned_carts",
        },
      });

      await supabase
        .from("carts")
        .update({
          last_abandon_notified_at: now.toISOString(),
          abandon_notify_count: 2,
        })
        .eq("id", cart.id);

      abandoned24h++;
    }
  } catch (err) {
    console.error("[AbandonedCarts] Error:", err);
    return NextResponse.json(
      { error: "Processing error", abandoned2h, abandoned24h },
      { status: 500 },
    );
  }

  return NextResponse.json({
    schedule: "every-15min",
    abandoned2h,
    abandoned24h,
    total: abandoned2h + abandoned24h,
  });
}
