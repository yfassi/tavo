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
        .in(
          'venue_id',
          venues.map((v) => v.id),
        )
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
    ? Math.max(
        0,
        Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null

  return {
    plan: sub.plan,
    status: sub.status,
    trialDaysLeft,
    isActive: isPlanActive(sub.status),
  }
}
