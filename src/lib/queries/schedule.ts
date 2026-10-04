import { createServerClient } from '@/lib/supabase/server'

export async function getScreenWithSchedules(screenId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screens')
    .select('*, scenes(*, template:templates(*), schedules(*))')
    .eq('id', screenId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
