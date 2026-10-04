import { createServerClient } from '@/lib/supabase/server'

export async function getStudioJobs(organizationId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('image_jobs')
    .select('*, source_asset:assets!source_asset_id(*), result_asset:assets!result_asset_id(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function getCreditBalance(organizationId: string): Promise<number> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('credit_ledger')
    .select('balance_after')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data?.balance_after ?? 0
}
