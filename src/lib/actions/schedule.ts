'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export { DAY_LABELS }

export async function createSchedule(
  sceneId: string,
  data: {
    label: string
    daysOfWeek: number[]
    startTime: string
    endTime: string
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('schedules').insert({
    scene_id: sceneId,
    label: data.label,
    days_of_week: data.daysOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    label?: string
    daysOfWeek?: number[]
    startTime?: string
    endTime?: string
    isActive?: boolean
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('schedules')
    .update({
      label: data.label,
      days_of_week: data.daysOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      is_active: data.isActive,
    })
    .eq('id', scheduleId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function deleteSchedule(scheduleId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function updateSceneTemplate(sceneId: string, templateId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('scenes')
    .update({ template_id: templateId })
    .eq('id', sceneId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}
