// ================================================================
//  Cron: детекция неактивных клиентов (ежедневно в 10:00 UTC)
//  Находит клиентов которые не покупали 30+ дней и запускает
//  воронку реактивации через trackFunnelEvent
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let processed = 0;
  let skippedAlreadyInFunnel = 0;

  try {
    // Найти профили с Telegram, у которых последний заказ > 30 дней назад
    // Но не старше 60 дней (чтоб не спамить очень давно ушедших)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, phone, telegram_chat_id, total_orders")
      .not("telegram_chat_id", "is", null)
      .gt("total_orders", 0)
      .limit(100);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ processed: 0, message: "No profiles found" });
    }

    for (const profile of profiles) {
      try {
        // Проверяем дату последнего заказа
        const { data: lastOrder } = await supabase
          .from("orders")
          .select("created_at")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastOrder) continue;

        const lastOrderDate = new Date(lastOrder.created_at);

        // Пропускаем если заказ менее 30 дней назад
        if (lastOrderDate > thirtyDaysAgo) continue;

        // Пропускаем если заказ более 60 дней назад (слишком давно)
        if (lastOrderDate < sixtyDaysAgo) continue;

        // Проверяем не в воронке ли реактивации уже
        const { data: existingContact } = await supabase
          .from("funnel_contacts")
          .select("id, entered_stage_at")
          .eq("profile_id", profile.id)
          .eq("is_active", true)
          .in(
            "funnel_id",
            // Находим ID воронки реактивации
            (
              await supabase
                .from("funnels")
                .select("id")
                .eq("slug", "reactivation")
            ).data?.map((f) => f.id) || [],
          )
          .limit(1);

        if (existingContact && existingContact.length > 0) {
          // Уже в воронке реактивации — не дублируем
          const enteredAt = new Date(existingContact[0].entered_stage_at);
          const daysSinceEntered =
            (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
          // Если был добавлен менее 30 дней назад — пропускаем
          if (daysSinceEntered < 30) {
            skippedAlreadyInFunnel++;
            continue;
          }
        }

        // Рассчитываем сколько дней без заказа
        const daysSinceOrder = Math.floor(
          (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Эмитим событие в движок воронок
        await trackFunnelEvent({
          event: "cron_inactive_check",
          profileId: profile.id,
          name: profile.first_name || undefined,
          phone: profile.phone || undefined,
          metadata: {
            days_since_order: daysSinceOrder,
            days_since_last_order: String(daysSinceOrder),
            total_orders: profile.total_orders,
            source: "cron_inactive_clients",
          },
        });

        processed++;
      } catch (err) {
        console.error(
          `[InactiveClients] Error processing profile ${profile.id}:`,
          err,
        );
      }
    }
  } catch (err) {
    console.error("[InactiveClients] Error:", err);
    return NextResponse.json(
      { error: "Processing error", processed },
      { status: 500 },
    );
  }

  return NextResponse.json({
    schedule: "daily-10am",
    processed,
    skippedAlreadyInFunnel,
  });
}
