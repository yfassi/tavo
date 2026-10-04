'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function createScreen(
  venueId: string,
  name: string,
  orientation: 'landscape' | 'portrait',
) {
  const supabase = await createServerClient()
  const token = crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const { data: screen, error } = await supabase
    .from('screens')
    .insert({ venue_id: venueId, name, orientation, token_hash: tokenHash })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Create a default scene with the first available template
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (template && screen) {
    const { data: scene } = await supabase
      .from('scenes')
      .insert({ screen_id: screen.id, template_id: template.id, data: {} })
      .select()
      .single()

    if (scene) {
      await supabase.from('schedules').insert({
        scene_id: scene.id,
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        start_time: '00:00',
        end_time: '23:59',
        label: 'Toute la journée',
      })
    }
  }

  revalidatePath('/tv')
  return { screen, token }
}

export async function deleteScreen(screenId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('screens').delete().eq('id', screenId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}
