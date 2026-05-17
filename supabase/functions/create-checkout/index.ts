import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const PACKAGES: Record<string, { gems: number; amount: number; label: string }> = {
  g100:  { gems: 100,  amount: 49000,  label: '100 гемов — Стартовый' },
  g300:  { gems: 300,  amount: 129000, label: '300 гемов — Популярный' },
  g750:  { gems: 750,  amount: 299000, label: '750 гемов — Большой' },
  g2000: { gems: 2000, amount: 699000, label: '2000 гемов — Максимальный' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error } = await sb.auth.getUser()
    if (error || !user) throw new Error('Invalid token')

    const { packageId } = await req.json()
    const pkg = PACKAGES[packageId]
    if (!pkg) throw new Error('Unknown package')

    const origin = req.headers.get('origin') || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'kzt',
          product_data: {
            name: pkg.label,
            description: 'Дубовая Доска · внутриигровая валюта',
            images: [],
          },
          unit_amount: pkg.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}?payment=success&gems=${pkg.gems}`,
      cancel_url: `${origin}?payment=cancel`,
      metadata: { userId: user.id, gems: String(pkg.gems), packageId },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
