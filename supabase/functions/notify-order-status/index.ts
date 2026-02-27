import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const statusTexts: Record<string, { title: string; body: string }> = {
  processing: {
    title: 'Замовлення обробляється',
    body: 'Ваше замовлення прийнято в обробку',
  },
  shipped: {
    title: 'Замовлення відправлено',
    body: 'Ваше замовлення відправлено',
  },
  delivered: {
    title: 'Замовлення доставлено',
    body: 'Ваше замовлення доставлено. Дякуємо за покупку!',
  },
  cancelled: {
    title: 'Замовлення скасовано',
    body: 'Ваше замовлення було скасовано',
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id, new_status, ttn } = await req.json()

    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: 'order_id and new_status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('profile_id, order_number')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found', details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!order.profile_id) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no profile_id on order' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const texts = statusTexts[new_status] ?? {
      title: 'Оновлення замовлення',
      body: `Статус замовлення змінено на: ${new_status}`,
    }

    const titleWithNumber = order.order_number
      ? `${texts.title} №${order.order_number}`
      : texts.title

    const bodyWithTtn =
      new_status === 'shipped' && ttn
        ? `${texts.body}. ТТН: ${ttn}`
        : texts.body

    await supabase.from('notifications_feed').insert({
      profile_id: order.profile_id,
      type: 'order',
      title: titleWithNumber,
      body: bodyWithTtn,
      link: '/account/orders',
      metadata: { order_id, status: new_status, ttn: ttn ?? null },
    })

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile_id', order.profile_id)
      .eq('is_active', true)

    let pushResult = null

    if (tokens && tokens.length > 0) {
      const messages = tokens.map((t: { token: string }) => ({
        to: t.token,
        sound: 'default',
        title: titleWithNumber,
        body: bodyWithTtn,
        data: { order_id, status: new_status, link: '/account/orders' },
      }))

      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })

      pushResult = await pushResponse.json()
    }

    return new Response(
      JSON.stringify({
        ok: true,
        notification_saved: true,
        push_sent: tokens?.length ?? 0,
        push_result: pushResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
