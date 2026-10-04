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
  const { data } = await supabase.from('templates').select('*').order('family', { ascending: true })

  return data ?? []
}

export async function toggleTemplate(templateId: string, isActive: boolean) {
  await supabase.from('templates').update({ is_active: isActive }).eq('id', templateId)
}
