'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export async function exportOrganizationData(): Promise<string> {
  const { organization } = await getSession()
  const supabase = await createServerClient()

  const [
    { data: venues },
    { data: menus },
    { data: subscriptions },
    { data: aiJobs },
    { data: imageJobs },
    { data: creditLedger },
  ] = await Promise.all([
    supabase
      .from('venues')
      .select('*, brand_kit:brand_kits(*)')
      .eq('organization_id', organization.id),
    supabase
      .from('menus')
      .select(
        '*, categories:menu_categories(*, items:menu_items(*, prices:menu_item_prices(*), allergens:menu_item_allergens(*)))',
      )
      .in(
        'venue_id',
        (
          await supabase.from('venues').select('id').eq('organization_id', organization.id)
        ).data?.map((v) => v.id) ?? [],
      ),
    supabase.from('subscriptions').select('*').eq('organization_id', organization.id),
    supabase
      .from('ai_jobs')
      .select('id, type, status, model, tokens_used, cost_cents, created_at')
      .eq('organization_id', organization.id),
    supabase
      .from('image_jobs')
      .select('id, type, provider, status, cost_cents, created_at')
      .eq('organization_id', organization.id),
    supabase
      .from('credit_ledger')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at'),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    organization: { id: organization.id, name: organization.name },
    venues,
    menus,
    subscriptions,
    aiJobs,
    imageJobs,
    creditLedger,
  }

  return JSON.stringify(exportData, null, 2)
}

export async function requestAccountDeletion(): Promise<void> {
  const { organization } = await getSession()
  const supabase = await createServerClient()

  // Mark the subscription as canceled
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('organization_id', organization.id)

  // In a real implementation, this would:
  // 1. Send a confirmation email
  // 2. Schedule data anonymization after 30 days
  // 3. Schedule Storage file deletion
  // For now, we mark the org name as deleted
  await supabase
    .from('organizations')
    .update({ name: `[Supprimé] ${organization.name}` })
    .eq('id', organization.id)
}
