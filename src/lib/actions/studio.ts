'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getImageProvider } from '@/lib/images'
import { getSession } from '@/lib/auth/get-session'
import { getSubscriptionStatus } from '@/lib/stripe/guards'

export async function uploadPhoto(formData: FormData) {
  const { organization } = await getSession()
  const supabase = await createServerClient()
  const file = formData.get('photo') as File
  if (!file) throw new Error('No file')

  const ext = file.name.split('.').pop()
  const path = `photos/${organization.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('assets').upload(path, file)

  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(path)

  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      organization_id: organization.id,
      type: 'photo',
      original_url: publicUrl,
      filename: file.name,
      mime_type: file.type,
      rights_confirmed: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/studio')
  return asset
}

export async function processImage(assetId: string, type: 'enhance' | 'remove_bg' | 'scene') {
  const { organization } = await getSession()
  const subStatus = await getSubscriptionStatus(organization.id)
  if (!subStatus.isActive) {
    throw new Error("Votre abonnement n'est pas actif. Veuillez souscrire une offre.")
  }

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
  if (balance <= 0) {
    throw new Error('Quota mensuel atteint')
  }

  // Create job
  const { data: job, error } = await supabase
    .from('image_jobs')
    .insert({
      organization_id: organization.id,
      source_asset_id: assetId,
      type,
      status: 'processing',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  try {
    // Get source image
    const { data: asset } = await supabase
      .from('assets')
      .select('original_url')
      .eq('id', assetId)
      .single()

    if (!asset) throw new Error('Asset not found')

    const imageResponse = await fetch(asset.original_url)
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Process
    const provider = getImageProvider()
    let result

    switch (type) {
      case 'enhance':
        result = await provider.enhance(imageBuffer)
        break
      case 'remove_bg':
        result = await provider.removeBackground(imageBuffer)
        break
      case 'scene':
        result = await provider.replaceScene(imageBuffer, {
          surface: 'marble',
          lighting: 'warm',
          style: 'modern',
        })
        break
    }

    // Upload result
    const resultPath = `processed/${organization.id}/${crypto.randomUUID()}.${result.mimeType === 'image/png' ? 'png' : 'jpg'}`
    await supabase.storage.from('assets').upload(resultPath, result.buffer, {
      contentType: result.mimeType,
    })

    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(resultPath)

    // Create result asset
    const { data: resultAsset } = await supabase
      .from('assets')
      .insert({
        organization_id: organization.id,
        type: 'photo',
        original_url: publicUrl,
        mime_type: result.mimeType,
        width: result.width,
        height: result.height,
        has_background_removed: type === 'remove_bg',
      })
      .select()
      .single()

    // Update job
    await supabase
      .from('image_jobs')
      .update({
        status: 'completed',
        result_asset_id: resultAsset?.id,
      })
      .eq('id', job.id)

    // Consume credit
    await supabase.from('credit_ledger').insert({
      organization_id: organization.id,
      type: 'consume',
      amount: -1,
      balance_after: balance - 1,
      description: `Traitement ${type}`,
      image_job_id: job.id,
    })
  } catch (err) {
    await supabase
      .from('image_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', job.id)
    throw err
  }

  revalidatePath('/studio')
}

export async function validateImage(jobId: string) {
  const supabase = await createServerClient()
  await supabase.from('image_jobs').update({ status: 'completed' }).eq('id', jobId)
  revalidatePath('/studio')
}

export async function rejectImage(jobId: string) {
  const supabase = await createServerClient()
  await supabase.from('image_jobs').update({ status: 'rejected' }).eq('id', jobId)
  revalidatePath('/studio')
}
