'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { Allergen } from '@/lib/types/menu'

async function revalidateMenu() {
  revalidatePath('/carte')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}

export async function createCategory(menuId: string, name: string) {
  const supabase = await createServerClient()

  // Get next sort_order
  const { data: existing } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .eq('menu_id', menuId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ menu_id: menuId, name, sort_order: sortOrder })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await revalidateMenu()
  return data
}

export async function updateCategory(id: string, updates: { name?: string; sort_order?: number }) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('menu_categories').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function deleteCategory(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function createItem(
  categoryId: string,
  data: { name: string; description?: string; prices: { label: string; amountCents: number }[] },
) {
  const supabase = await createServerClient()

  // Get next sort_order
  const { data: existing } = await supabase
    .from('menu_items')
    .select('sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0

  const { data: item, error } = await supabase
    .from('menu_items')
    .insert({
      category_id: categoryId,
      name: data.name,
      description: data.description ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Insert prices
  if (data.prices.length > 0) {
    await supabase.from('menu_item_prices').insert(
      data.prices.map((p, i) => ({
        item_id: item.id,
        label: p.label,
        amount_cents: p.amountCents,
        sort_order: i,
      })),
    )
  }

  await revalidateMenu()
  return item
}

export async function updateItem(
  id: string,
  updates: {
    name?: string
    description?: string | null
    is_available?: boolean
    is_daily_special?: boolean
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('menu_items').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function deleteItem(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function updatePrice(id: string, amountCents: number) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('menu_item_prices')
    .update({ amount_cents: amountCents })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function addPrice(itemId: string, label: string, amountCents: number) {
  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from('menu_item_prices')
    .select('sort_order')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0

  const { error } = await supabase.from('menu_item_prices').insert({
    item_id: itemId,
    label,
    amount_cents: amountCents,
    sort_order: sortOrder,
  })
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function deletePrice(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('menu_item_prices').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function toggleAllergen(itemId: string, allergen: Allergen, confirmed: boolean) {
  const supabase = await createServerClient()

  // Check if allergen exists
  const { data: existing } = await supabase
    .from('menu_item_allergens')
    .select('id')
    .eq('item_id', itemId)
    .eq('allergen', allergen)
    .single()

  if (existing) {
    // Remove it
    await supabase.from('menu_item_allergens').delete().eq('id', existing.id)
  } else {
    // Add it
    await supabase.from('menu_item_allergens').insert({
      item_id: itemId,
      allergen,
      is_confirmed: confirmed,
    })
  }
  await revalidateMenu()
}

export async function confirmAllergen(id: string, isConfirmed: boolean) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('menu_item_allergens')
    .update({ is_confirmed: isConfirmed })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await revalidateMenu()
}

export async function reorderCategories(menuId: string, orderedIds: string[]) {
  const supabase = await createServerClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('menu_categories').update({ sort_order: index }).eq('id', id),
    ),
  )
  await revalidateMenu()
}

export async function reorderItems(categoryId: string, orderedIds: string[]) {
  const supabase = await createServerClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('menu_items').update({ sort_order: index }).eq('id', id),
    ),
  )
  await revalidateMenu()
}

export async function toggleDailySpecial(itemId: string, isDailySpecial: boolean) {
  return updateItem(itemId, { is_daily_special: isDailySpecial })
}

export async function toggleAvailability(itemId: string, isAvailable: boolean) {
  return updateItem(itemId, { is_available: isAvailable })
}
