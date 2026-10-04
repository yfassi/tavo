import { createServerClient } from '@/lib/supabase/server'
import type { BrandKit } from '@/lib/types/brand'

export async function getBrandKit(venueId: string): Promise<BrandKit | null> {
  const supabase = await createServerClient()
  const { data } = await supabase.from('brand_kits').select('*').eq('venue_id', venueId).single()
  return data
}
