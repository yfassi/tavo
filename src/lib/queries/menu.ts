import { createServerClient } from '@/lib/supabase/server'
import type {
  Menu,
  MenuCategory,
  MenuItem,
  MenuItemPrice,
  MenuItemAllergen,
} from '@/lib/types/menu'

export type MenuWithItems = Menu & {
  categories: (MenuCategory & {
    items: (MenuItem & {
      prices: MenuItemPrice[]
      allergens: MenuItemAllergen[]
    })[]
  })[]
}

export async function getMenuWithItems(venueId: string): Promise<MenuWithItems | null> {
  const supabase = await createServerClient()

  const { data: menu } = await supabase
    .from('menus')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .single()

  if (!menu) return null

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('menu_id', menu.id)
    .order('sort_order')

  if (!categories) return { ...menu, categories: [] }

  const categoryIds = categories.map((c) => c.id)

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categoryIds)
    .order('sort_order')

  const itemIds = items?.map((i) => i.id) ?? []

  const [{ data: prices }, { data: allergens }] = await Promise.all([
    supabase.from('menu_item_prices').select('*').in('item_id', itemIds).order('sort_order'),
    supabase.from('menu_item_allergens').select('*').in('item_id', itemIds),
  ])

  const itemsWithRelations = (items ?? []).map((item) => ({
    ...item,
    prices: (prices ?? []).filter((p) => p.item_id === item.id),
    allergens: (allergens ?? []).filter((a) => a.item_id === item.id),
  }))

  const categoriesWithItems = categories.map((cat) => ({
    ...cat,
    items: itemsWithRelations.filter((i) => i.category_id === cat.id),
  }))

  return { ...menu, categories: categoriesWithItems }
}
