# Phase 3: Stripe Subscriptions + Plan Guards + Admin Back-office

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing (trial → paid), enforce plan limits across features, and build a minimal admin back-office for monitoring clients, templates, and AI usage.

**Architecture:** Stripe Checkout (hosted) for payment, Customer Portal for self-service management, webhooks for subscription lifecycle sync. Plan limits enforced via a shared `checkPlanLimit()` guard called before creating venues, screens, or consuming credits. Admin pages behind a role check (`admin` membership role).

**Tech Stack:** Stripe SDK (`stripe`), existing Supabase schema (`subscriptions`, `credit_ledger`), existing auth (`getSession()`).

## Global Constraints

- TypeScript strict mode
- UI text in French (France), code and comments in English
- pnpm, Conventional Commits
- Amounts as integer cents, displayed via `formatPrice()`
- No Stripe secret keys client-side — all Stripe calls server-side
- Stripe webhook signature verification required
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env vars
- shadcn/ui uses `@base-ui/react` — use `render` prop, not `asChild`
- Existing interfaces: `createServerClient()`, `getSession()`, `getImageProvider()`

---

### Task 1: Stripe SDK + Plan Limits + Guards

**Files:**
- Create: `src/lib/stripe/client.ts`
- Create: `src/lib/stripe/plans.ts`
- Create: `src/lib/stripe/guards.ts`
- Create: `tests/unit/plan-guards.test.ts`

**Interfaces:**
- Consumes: `createServerClient()` from `@/lib/supabase/server`
- Produces:
  - `getStripeClient(): Stripe` — server-side singleton
  - `PLAN_LIMITS: Record<string, PlanLimit>` — limits per plan slug
  - `type PlanLimit = { venues: number; screens: number; monthlyCredits: number }`
  - `checkPlanLimit(organizationId: string, resource: 'venues' | 'screens'): Promise<{ allowed: boolean; current: number; limit: number }>` — checks if org can create more of the resource
  - `getSubscriptionStatus(organizationId: string): Promise<{ plan: string; status: string; trialDaysLeft: number | null; isActive: boolean }>`

- [ ] **Step 1: Install Stripe SDK**

```bash
pnpm add stripe
```

- [ ] **Step 2: Write failing test for plan guards**

Create `tests/unit/plan-guards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, isPlanActive } from '@/lib/stripe/plans'

describe('PLAN_LIMITS', () => {
  it('has correct limits for trial', () => {
    expect(PLAN_LIMITS.trial.venues).toBe(3)
    expect(PLAN_LIMITS.trial.screens).toBe(3)
    expect(PLAN_LIMITS.trial.monthlyCredits).toBe(100)
  })

  it('has correct limits for starter', () => {
    expect(PLAN_LIMITS.starter.venues).toBe(1)
    expect(PLAN_LIMITS.starter.screens).toBe(1)
    expect(PLAN_LIMITS.starter.monthlyCredits).toBe(30)
  })

  it('has correct limits for pro', () => {
    expect(PLAN_LIMITS.pro.venues).toBe(3)
    expect(PLAN_LIMITS.pro.screens).toBe(3)
    expect(PLAN_LIMITS.pro.monthlyCredits).toBe(100)
  })
})

describe('isPlanActive', () => {
  it('returns true for trialing status', () => {
    expect(isPlanActive('trialing')).toBe(true)
  })

  it('returns true for active status', () => {
    expect(isPlanActive('active')).toBe(true)
  })

  it('returns false for canceled status', () => {
    expect(isPlanActive('canceled')).toBe(false)
  })

  it('returns false for past_due status', () => {
    expect(isPlanActive('past_due')).toBe(false)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

```bash
pnpm test -- tests/unit/plan-guards.test.ts
```

- [ ] **Step 4: Implement Stripe client and plan limits**

Create `src/lib/stripe/client.ts`:

```ts
import Stripe from 'stripe'

let instance: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-04-30.basil',
    })
  }
  return instance
}
```

Create `src/lib/stripe/plans.ts`:

```ts
export interface PlanLimit {
  venues: number
  screens: number
  monthlyCredits: number
}

export const PLAN_LIMITS: Record<string, PlanLimit> = {
  trial: { venues: 3, screens: 3, monthlyCredits: 100 },
  starter: { venues: 1, screens: 1, monthlyCredits: 30 },
  pro: { venues: 3, screens: 3, monthlyCredits: 100 },
}

export function isPlanActive(status: string): boolean {
  return status === 'trialing' || status === 'active'
}

export function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
```

Create `src/lib/stripe/guards.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, isPlanActive } from './plans'

export async function checkPlanLimit(
  organizationId: string,
  resource: 'venues' | 'screens',
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = await createServerClient()

  // Get subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('organization_id', organizationId)
    .single()

  if (!sub || !isPlanActive(sub.status)) {
    return { allowed: false, current: 0, limit: 0 }
  }

  const limits = PLAN_LIMITS[sub.plan] ?? PLAN_LIMITS.starter
  const limit = limits[resource]

  // Count current resources
  let current = 0
  if (resource === 'venues') {
    const { count } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    current = count ?? 0
  } else if (resource === 'screens') {
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('organization_id', organizationId)

    if (venues && venues.length > 0) {
      const { count } = await supabase
        .from('screens')
        .select('*', { count: 'exact', head: true })
        .in('venue_id', venues.map((v) => v.id))
      current = count ?? 0
    }
  }

  return { allowed: current < limit, current, limit }
}

export async function getSubscriptionStatus(organizationId: string) {
  const supabase = await createServerClient()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (!sub) {
    return { plan: 'none', status: 'canceled', trialDaysLeft: null, isActive: false }
  }

  const trialDaysLeft = sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return {
    plan: sub.plan,
    status: sub.status,
    trialDaysLeft,
    isActive: isPlanActive(sub.status),
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
pnpm test -- tests/unit/plan-guards.test.ts
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add Stripe SDK, plan limits, and subscription guards"
```

---

### Task 2: Stripe Checkout + Customer Portal + Subscription Page

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`
- Create: `src/app/(dashboard)/parametres/abonnement/page.tsx`
- Create: `src/components/parametres/subscription-card.tsx`
- Create: `src/components/parametres/trial-banner.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` — add trial banner

**Interfaces:**
- Consumes: `getStripeClient()` from Task 1, `getSession()`, `getSubscriptionStatus()` from Task 1, `PLAN_LIMITS` from Task 1, `formatPrice()`
- Produces:
  - `POST /api/stripe/checkout` — creates Stripe Checkout session, returns `{ url }`
  - `POST /api/stripe/portal` — creates Customer Portal session, returns `{ url }`
  - `/parametres/abonnement` page with plan comparison and subscribe/manage buttons
  - `<TrialBanner />` component showing "Essai : X jours restants"

- [ ] **Step 1: Create the Stripe Checkout API route**

Create `src/app/api/stripe/checkout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

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
```

- [ ] **Step 2: Create the Customer Portal API route**

Create `src/app/api/stripe/portal/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
  }

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/parametres/abonnement`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 3: Create the trial banner component**

Create `src/components/parametres/trial-banner.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface TrialBannerProps {
  daysLeft: number
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm">
      <span className="text-amber-800">
        Essai gratuit : <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> restant{daysLeft > 1 ? 's' : ''}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-800 hover:bg-amber-100"
        onClick={() => router.push('/parametres/abonnement')}
      >
        S&apos;abonner
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Create the subscription card component**

Create `src/components/parametres/subscription-card.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface Plan {
  name: string
  slug: string
  price: string
  priceId: string
  features: string[]
  highlighted?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    slug: 'starter',
    price: '29 €/mois',
    priceId: '', // Set via env or Stripe Dashboard
    features: [
      '1 établissement',
      '1 écran TV',
      '30 crédits photo/mois',
      '6 templates',
      'Menu interactif',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: '59 €/mois',
    priceId: '', // Set via env or Stripe Dashboard
    features: [
      '3 établissements',
      '3 écrans TV',
      '100 crédits photo/mois',
      '6 templates',
      'Menu interactif',
    ],
    highlighted: true,
  },
]

interface SubscriptionCardProps {
  currentPlan: string
  status: string
  trialDaysLeft: number | null
  isActive: boolean
}

export function SubscriptionCard({
  currentPlan,
  status,
  trialDaysLeft,
  isActive,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(priceId: string) {
    if (!priceId) {
      alert('Les identifiants de prix Stripe ne sont pas encore configurés.')
      return
    }
    setLoading(priceId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  const statusLabels: Record<string, string> = {
    trialing: 'Essai gratuit',
    active: 'Actif',
    past_due: 'Paiement en retard',
    canceled: 'Annulé',
  }

  return (
    <div className="space-y-6">
      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Votre abonnement</span>
            <Badge variant={isActive ? 'default' : 'destructive'}>
              {statusLabels[status] ?? status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Plan actuel : <strong>{currentPlan === 'trial' ? 'Essai gratuit' : currentPlan === 'starter' ? 'Starter' : 'Pro'}</strong>
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <span> — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}</span>
            )}
          </p>
          {status !== 'trialing' && status !== 'canceled' && (
            <Button variant="outline" className="mt-4" onClick={handlePortal} disabled={loading === 'portal'}>
              {loading === 'portal' ? 'Chargement...' : 'Gérer mon abonnement'}
            </Button>
          )}
          {status === 'canceled' && (
            <p className="mt-2 text-sm text-destructive">
              Votre abonnement est annulé. Choisissez une offre pour continuer.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      {(status === 'trialing' || status === 'canceled') && (
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <Card key={plan.slug} className={plan.highlighted ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.highlighted && <Badge>Recommandé</Badge>}
                </CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={loading === plan.priceId}
                >
                  {loading === plan.priceId ? 'Chargement...' : 'Choisir'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create the subscription page**

Create `src/app/(dashboard)/parametres/abonnement/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getSubscriptionStatus } from '@/lib/stripe/guards'
import { SubscriptionCard } from '@/components/parametres/subscription-card'

export default async function AbonnementPage() {
  const { organization } = await getSession()
  const subStatus = await getSubscriptionStatus(organization.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Abonnement</h1>
      <SubscriptionCard
        currentPlan={subStatus.plan}
        status={subStatus.status}
        trialDaysLeft={subStatus.trialDaysLeft}
        isActive={subStatus.isActive}
      />
    </div>
  )
}
```

- [ ] **Step 6: Add trial banner to dashboard layout**

Modify `src/app/(dashboard)/layout.tsx` — import and render `TrialBanner` when status is `trialing`:

```tsx
import { TrialBanner } from '@/components/parametres/trial-banner'
import { getSubscriptionStatus } from '@/lib/stripe/guards'

// Inside the component, after getSession:
const subStatus = await getSubscriptionStatus(organization.id)

// In the JSX, before {children}:
{subStatus.status === 'trialing' && subStatus.trialDaysLeft !== null && (
  <TrialBanner daysLeft={subStatus.trialDaysLeft} />
)}
```

- [ ] **Step 7: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add Stripe Checkout, Customer Portal, subscription page, and trial banner"
```

---

### Task 3: Stripe Webhooks

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `getStripeClient()` from Task 1, `PLAN_LIMITS` from Task 1, `createClient` from `@supabase/supabase-js` (service role, no cookies)
- Produces: `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

- [ ] **Step 1: Create the webhook route**

Create `src/app/api/webhooks/stripe/route.ts`:

```ts
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

      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          plan: planSlug,
          status: 'active',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
      const subscriptionId = invoice.subscription as string
      if (!subscriptionId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const customerId = invoice.customer as string

      // Find org by customer ID
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('organization_id, plan')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!sub) break

      const planSlug = determinePlanSlug(subscription)

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan: planSlug,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('organization_id', sub.organization_id)

      // Grant monthly credits (renewal)
      if (invoice.billing_reason === 'subscription_cycle') {
        const credits = PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30
        await grantCredits(sub.organization_id, credits, 'Renouvellement mensuel des crédits')
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const planSlug = determinePlanSlug(subscription)

      await supabase
        .from('subscriptions')
        .update({
          plan: planSlug,
          status: mapStripeStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          monthly_image_credits: PLAN_LIMITS[planSlug]?.monthlyCredits ?? 30,
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

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
  // Map Stripe price to plan slug
  // In production, this would check the price ID against configured plans
  // For now, default to 'starter' — the mapping is configured in Stripe Dashboard
  const amount = subscription.items.data[0]?.price.unit_amount ?? 0
  if (amount >= 5000) return 'pro'
  if (amount >= 2000) return 'starter'
  return 'starter'
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    default: return 'canceled'
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
```

- [ ] **Step 2: Add `.env.example` entries**

The `.env.example` already has `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Verify they exist.

- [ ] **Step 3: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add Stripe webhook handler for subscription lifecycle events"
```

---

### Task 4: Admin Back-office

**Files:**
- Create: `src/app/(dashboard)/admin/page.tsx`
- Create: `src/app/(dashboard)/admin/clients/page.tsx`
- Create: `src/app/(dashboard)/admin/templates/page.tsx`
- Create: `src/app/(dashboard)/admin/ai-jobs/page.tsx`
- Create: `src/app/(dashboard)/admin/image-jobs/page.tsx`
- Create: `src/app/(dashboard)/admin/layout.tsx`
- Create: `src/lib/queries/admin.ts`

**Interfaces:**
- Consumes: `createServerClient()`, `getSession()`, admin role check
- Produces:
  - Admin layout that redirects non-admin users
  - `/admin` dashboard with stats
  - `/admin/clients` — org list with plan, status, credits
  - `/admin/templates` — template list with activate/deactivate
  - `/admin/ai-jobs` — AI job log
  - `/admin/image-jobs` — image job log

- [ ] **Step 1: Create admin queries**

Create `src/lib/queries/admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function getAdminStats() {
  const [{ count: orgCount }, { count: screenCount }, { count: aiJobsToday }] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('screens').select('*', { count: 'exact', head: true }),
    supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ])

  return {
    orgCount: orgCount ?? 0,
    screenCount: screenCount ?? 0,
    aiJobsToday: aiJobsToday ?? 0,
  }
}

export async function getAdminClients() {
  const { data } = await supabase
    .from('organizations')
    .select('*, subscriptions(*), memberships(user_id)')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getAdminAiJobs(limit = 50) {
  const { data } = await supabase
    .from('ai_jobs')
    .select('*, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getAdminImageJobs(limit = 50) {
  const { data } = await supabase
    .from('image_jobs')
    .select('*, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getAdminTemplates() {
  const { data } = await supabase
    .from('templates')
    .select('*')
    .order('family', { ascending: true })

  return data ?? []
}

export async function toggleTemplate(templateId: string, isActive: boolean) {
  await supabase
    .from('templates')
    .update({ is_active: isActive })
    .eq('id', templateId)
}
```

- [ ] **Step 2: Create admin layout with role guard**

Create `src/app/(dashboard)/admin/layout.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getSession()

  if (role !== 'admin') {
    redirect('/carte')
  }

  return (
    <div>
      <nav className="mb-6 flex gap-4 border-b pb-3">
        <a href="/admin" className="text-sm font-medium hover:underline">Tableau de bord</a>
        <a href="/admin/clients" className="text-sm font-medium hover:underline">Clients</a>
        <a href="/admin/templates" className="text-sm font-medium hover:underline">Templates</a>
        <a href="/admin/ai-jobs" className="text-sm font-medium hover:underline">Jobs IA</a>
        <a href="/admin/image-jobs" className="text-sm font-medium hover:underline">Jobs Images</a>
      </nav>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create admin dashboard page**

Create `src/app/(dashboard)/admin/page.tsx`:

```tsx
import { getAdminStats } from '@/lib/queries/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminPage() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Organisations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.orgCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Écrans actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.screenCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Jobs IA aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.aiJobsToday}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create admin clients page**

Create `src/app/(dashboard)/admin/clients/page.tsx`:

```tsx
import { getAdminClients } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminClientsPage() {
  const clients = await getAdminClients()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Membres</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{client.subscriptions?.[0]?.plan ?? '—'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={client.subscriptions?.[0]?.status === 'active' ? 'default' : 'secondary'}>
                    {client.subscriptions?.[0]?.status ?? '—'}
                  </Badge>
                </td>
                <td className="px-4 py-3">{client.memberships?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create admin templates page**

Create `src/app/(dashboard)/admin/templates/page.tsx`:

```tsx
import { getAdminTemplates } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminTemplatesPage() {
  const templates = await getAdminTemplates()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Templates</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Famille</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{t.family}</Badge></td>
                <td className="px-4 py-3">
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create admin AI jobs page**

Create `src/app/(dashboard)/admin/ai-jobs/page.tsx`:

```tsx
import { getAdminAiJobs } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/format'

export default async function AdminAiJobsPage() {
  const jobs = await getAdminAiJobs()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jobs IA</h1>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Modèle</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Coût</th>
              <th className="px-4 py-3 text-left font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3">{job.organization?.name ?? '—'}</td>
                <td className="px-4 py-3"><Badge variant="outline">{job.type}</Badge></td>
                <td className="px-4 py-3 text-xs font-mono">{job.model ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                    {job.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{job.cost_cents ? formatPrice(job.cost_cents) : '—'}</td>
                <td className="px-4 py-3">{job.tokens_used ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create admin image jobs page**

Create `src/app/(dashboard)/admin/image-jobs/page.tsx`:

```tsx
import { getAdminImageJobs } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminImageJobsPage() {
  const jobs = await getAdminImageJobs()

  const typeLabels: Record<string, string> = {
    enhance: 'Amélioration',
    remove_bg: 'Détourage',
    scene: 'Mise en scène',
    generate: 'Génération',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jobs Images</h1>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Fournisseur</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3">{job.organization?.name ?? '—'}</td>
                <td className="px-4 py-3">{typeLabels[job.type] ?? job.type}</td>
                <td className="px-4 py-3 text-xs">{job.provider}</td>
                <td className="px-4 py-3">
                  <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                    {job.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Add admin link to sidebar (conditional on role)**

Modify `src/components/dashboard/app-sidebar.tsx` — add an "Admin" link visible only when role is admin. The sidebar currently doesn't receive the role prop. Add it:

In `src/app/(dashboard)/layout.tsx`, pass `role` to `AppSidebar`:

```tsx
<AppSidebar role={role} />
```

In `src/components/dashboard/app-sidebar.tsx`, accept `role` prop and conditionally show admin link:

```tsx
import { Shield } from 'lucide-react'

export function AppSidebar({ role }: { role: string }) {
  // ... existing navigation
  // Add at the end of the navigation array, conditionally:
  const adminNav = role === 'admin' ? [{ name: 'Admin', href: '/admin', icon: Shield }] : []
  // Render adminNav items after the main navigation
}
```

- [ ] **Step 9: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add admin back-office with clients, templates, AI jobs, and image jobs"
```

---

### Task 5: Enforce Plan Limits in Actions

**Files:**
- Modify: `src/lib/actions/screen.ts` — add plan limit check before creating screen
- Modify: `src/lib/actions/studio.ts` — enforce credit check with plan-aware limits
- Modify: `src/lib/actions/menu.ts` — add venue count check before creating category (optional, venues are created at signup)

**Interfaces:**
- Consumes: `checkPlanLimit()` from Task 1, `getSubscriptionStatus()` from Task 1
- Produces: plan-enforced actions that throw clear French error messages when limits are exceeded

- [ ] **Step 1: Add plan guard to screen creation**

Modify `src/lib/actions/screen.ts` — at the top of `createScreen`, add:

```ts
import { checkPlanLimit } from '@/lib/stripe/guards'
import { getSession } from '@/lib/auth/get-session'

// Inside createScreen, before creating the screen:
const { organization } = await getSession()
const { allowed, current, limit } = await checkPlanLimit(organization.id, 'screens')
if (!allowed) {
  throw new Error(`Limite atteinte : ${current}/${limit} écran${limit > 1 ? 's' : ''} pour votre offre.`)
}
```

- [ ] **Step 2: Add subscription status check to studio processing**

Modify `src/lib/actions/studio.ts` — in `processImage`, after the credit check, also verify the subscription is active:

```ts
import { getSubscriptionStatus } from '@/lib/stripe/guards'

// Inside processImage, at the top:
const subStatus = await getSubscriptionStatus(organization.id)
if (!subStatus.isActive) {
  throw new Error('Votre abonnement n\'est pas actif. Veuillez souscrire une offre.')
}
```

- [ ] **Step 3: Add subscription check to AI import**

Modify `src/lib/actions/import.ts` — in `runMenuImport`, verify subscription is active:

```ts
import { getSubscriptionStatus } from '@/lib/stripe/guards'
import { getSession } from '@/lib/auth/get-session'

// At the top of runMenuImport:
const session = await getSession()
const subStatus = await getSubscriptionStatus(session.organization.id)
if (!subStatus.isActive) {
  throw new Error('Votre abonnement n\'est pas actif.')
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: enforce plan limits on screen creation, image processing, and AI import"
```

---

### Task 6: Final Verification + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-5
- Produces: updated docs, verified quality

- [ ] **Step 1: Run all quality checks**

```bash
rm -rf node_modules .next && pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

- [ ] **Step 2: Update CLAUDE.md**

Add:
- `src/lib/stripe/` — Stripe client, plan limits, subscription guards
- `src/app/api/stripe/` — Checkout and portal API routes
- `src/app/api/webhooks/stripe/` — Webhook handler
- `src/app/(dashboard)/admin/` — Admin back-office (role-gated)
- Stripe webhook requires `STRIPE_WEBHOOK_SECRET` for signature verification
- Plan limits enforced: screens, credits, subscription status
- Admin role set directly in DB (`memberships.role = 'admin'`)

- [ ] **Step 3: Commit and tag**

```bash
git add -A
git commit -m "docs: update CLAUDE.md for Phase 3"
git tag phase-3-complete
```
