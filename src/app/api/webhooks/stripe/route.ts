import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { PLAN_LIMITS } from '@/lib/stripe/plans'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripeClient()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organization_id
      if (!orgId) break

      const subscriptionId = session.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const planSlug = determinePlanSlug(subscription)
      const periodEnd = subscription.items.data[0]?.current_period_end

      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          plan: planSlug,
          status: 'active',
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          monthly_image_credits: PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30,
        })
        .eq('organization_id', orgId)

      // Grant monthly credits
      const credits = PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30
      await grantCredits(orgId, credits, 'Crédits mensuels — abonnement activé')
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionDetails = invoice.parent?.subscription_details
      const subscriptionId =
        typeof subscriptionDetails?.subscription === 'string'
          ? subscriptionDetails.subscription
          : subscriptionDetails?.subscription?.id
      if (!subscriptionId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (!customerId) break

      // Find org by customer ID
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('organization_id, plan')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!sub) break

      const planSlug = determinePlanSlug(subscription)
      const periodEnd = subscription.items.data[0]?.current_period_end

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan: planSlug,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq('organization_id', sub.organization_id)

      // Grant monthly credits on renewal cycle
      if (invoice.billing_reason === 'subscription_cycle') {
        const credits = PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30
        await grantCredits(sub.organization_id, credits, 'Renouvellement mensuel des crédits')
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (!customerId) break

      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      const planSlug = determinePlanSlug(subscription)
      const periodEnd = subscription.items.data[0]?.current_period_end

      await supabase
        .from('subscriptions')
        .update({
          plan: planSlug,
          status: mapStripeStatus(subscription.status),
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          monthly_image_credits: PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30,
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}

function determinePlanSlug(subscription: Stripe.Subscription): string {
  const amount = subscription.items.data[0]?.price.unit_amount ?? 0
  if (amount >= 5000) return 'pro'
  return 'starter'
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    default:
      return 'canceled'
  }
}

async function grantCredits(orgId: string, amount: number, description: string) {
  // Get current balance
  const { data: lastEntry } = await supabase
    .from('credit_ledger')
    .select('balance_after')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const currentBalance = lastEntry?.balance_after ?? 0

  await supabase.from('credit_ledger').insert({
    organization_id: orgId,
    type: 'grant',
    amount,
    balance_after: currentBalance + amount,
    description,
  })
}
