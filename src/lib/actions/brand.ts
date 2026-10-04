'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function updateBrandKit(
  id: string,
  data: {
    primary_color?: string
    secondary_color?: string | null
    accent_color?: string | null
    font_heading?: string
    font_body?: string
    tone_of_voice?: string
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('brand_kits').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/parametres')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}

export async function uploadLogo(venueId: string, formData: FormData) {
  const supabase = await createServerClient()
  const file = formData.get('logo') as File
  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop()
  const path = `logos/${venueId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(path, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(path)

  const { error } = await supabase.from('venues').update({ logo_url: publicUrl }).eq('id', venueId)

  if (error) throw new Error(error.message)
  revalidatePath('/parametres')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}
