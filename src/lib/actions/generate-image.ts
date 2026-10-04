'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { getImageProvider } from '@/lib/images'

export async function generateImage(prompt: string, itemId?: string) {
  const { organization } = await getSession()
  const supabase = await createServerClient()

  // Check credits
  const { data: lastCredit } = await supabase
    .from('credit_ledger')
    .select('balance_after')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const balance = lastCredit?.balance_after ?? 0
  if (balance <= 0) throw new Error('Quota mensuel atteint')

  // Create job
  const { data: job } = await supabase
    .from('image_jobs')
    .insert({
      organization_id: organization.id,
      source_asset_id: null,
      type: 'generate',
      status: 'processing',
      params: { prompt },
    })
    .select()
    .single()

  try {
    const provider = getImageProvider()
    const result = await provider.generateFromDescription(prompt)

    // Upload result
    const path = `generated/${organization.id}/${crypto.randomUUID()}.jpg`
    await supabase.storage.from('assets').upload(path, result.buffer, {
      contentType: result.mimeType,
    })

    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(path)

    // Create asset with ai_generated flag
    const { data: asset } = await supabase
      .from('assets')
      .insert({
        organization_id: organization.id,
        type: 'generated',
        original_url: publicUrl,
        mime_type: result.mimeType,
        width: result.width,
        height: result.height,
        ai_generated: true,
      })
      .select()
      .single()

    // Update job
    await supabase
      .from('image_jobs')
      .update({
        status: 'completed',
        result_asset_id: asset?.id,
      })
      .eq('id', job!.id)

    // If itemId provided, link the asset to the menu item
    if (itemId && asset) {
      await supabase.from('menu_items').update({ photo_asset_id: asset.id }).eq('id', itemId)
    }

    // Consume credit
    await supabase.from('credit_ledger').insert({
      organization_id: organization.id,
      type: 'consume',
      amount: -1,
      balance_after: balance - 1,
      description: "Génération d'image IA",
      image_job_id: job!.id,
    })
  } catch (err) {
    await supabase
      .from('image_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', job!.id)
    throw err
  }

  revalidatePath('/studio')
}
