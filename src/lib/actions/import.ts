'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { importMenuFromImage } from '@/lib/ai/menu-import'
import type { MenuImportResult } from '@/lib/ai/schemas'
import { getSubscriptionStatus } from '@/lib/stripe/guards'

export async function uploadMenuImage(formData: FormData) {
  const { organization } = await getSession()
  const supabase = await createServerClient()
  const file = formData.get('menu_image') as File
  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop()
  const path = `imports/${organization.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('assets').upload(path, file)

  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(path)

  return { imageUrl: publicUrl }
}

export async function runMenuImport(imageUrl: string) {
  const { organization } = await getSession()
  const subStatus = await getSubscriptionStatus(organization.id)
  if (!subStatus.isActive) {
    throw new Error("Votre abonnement n'est pas actif.")
  }
  const { jobId, result } = await importMenuFromImage(organization.id, imageUrl)
  return { jobId, result }
}

export async function confirmImport(menuId: string, importData: MenuImportResult) {
  const supabase = await createServerClient()

  for (const [catIndex, category] of importData.categories.entries()) {
    // Create category
    const { data: cat, error: catError } = await supabase
      .from('menu_categories')
      .insert({
        menu_id: menuId,
        name: category.name,
        sort_order: catIndex,
      })
      .select('id')
      .single()

    if (catError || !cat) continue

    for (const [itemIndex, item] of category.items.entries()) {
      // Create item
      const { data: menuItem, error: itemError } = await supabase
        .from('menu_items')
        .insert({
          category_id: cat.id,
          name: item.name,
          description: item.description ?? null,
          sort_order: itemIndex,
        })
        .select('id')
        .single()

      if (itemError || !menuItem) continue

      // Create prices
      if (item.prices.length > 0) {
        await supabase.from('menu_item_prices').insert(
          item.prices.map((p, i) => ({
            item_id: menuItem.id,
            label: p.label,
            amount_cents: p.amountCents,
            sort_order: i,
          })),
        )
      }

      // Create suggested allergens (not confirmed)
      if (item.suggestedAllergens.length > 0) {
        await supabase.from('menu_item_allergens').insert(
          item.suggestedAllergens.map((allergen) => ({
            item_id: menuItem.id,
            allergen,
            is_confirmed: false,
          })),
        )
      }
    }
  }

  revalidatePath('/carte')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}
