import { createServerClient } from '@/lib/supabase/server'

export async function getScreens(venueId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('screens')
    .select('*, scenes(*, template:templates(*), schedules(*))')
    .eq('venue_id', venueId)
    .order('created_at')
  return data ?? []
}

export async function getScreensWithNow(venueId: string) {
  const [screens, now] = await Promise.all([getScreens(venueId), Promise.resolve(Date.now())])
  return { screens, now }
}
