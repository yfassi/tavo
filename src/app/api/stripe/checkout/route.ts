import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { priceId } = await request.json()
  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
  }

  // Get or create Stripe customer
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', membership.organization_id)
    .single()

  const stripe = getStripeClient()
  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { organization_id: membership.organization_id },
    })
    customerId = customer.id

    await supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('organization_id', membership.organization_id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/parametres/abonnement?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/parametres/abonnement?canceled=true`,
    metadata: { organization_id: membership.organization_id },
  })

  return NextResponse.json({ url: session.url })
}
