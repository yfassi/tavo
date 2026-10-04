import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mapMenuToSlotData } from '@/lib/templates/data-mapper'
import type { MenuWithItems } from '@/lib/queries/menu'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenHash: string }> },
) {
  const { tokenHash } = await params

  // Find screen by token hash
  const { data: screen, error: screenError } = await supabase
    .from('screens')
    .select('*, venue:venues(*, brand_kit:brand_kits(*))')
    .eq('token_hash', tokenHash)
    .single()

  if (screenError || !screen) {
    return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
  }

  // Get current scene for this screen based on schedule
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // 1=Monday
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM

  const { data: scenes } = await supabase
    .from('scenes')
    .select('*, template:templates(*), schedules(*)')
    .eq('screen_id', screen.id)
    .order('sort_order')

  // Filter scenes by schedule
  const activeScene = scenes?.find((scene) =>
    scene.schedules?.some(
      (sch: { is_active: boolean; days_of_week: number[]; start_time: string; end_time: string }) =>
        sch.is_active &&
        sch.days_of_week.includes(dayOfWeek) &&
        currentTime >= sch.start_time.slice(0, 5) &&
        currentTime <= sch.end_time.slice(0, 5),
    ),
  )

  if (!activeScene) {
    return NextResponse.json({ error: 'No active scene' }, { status: 404 })
  }

  // Get menu data for the venue
  const { data: menu } = await supabase
    .from('menus')
    .select('*')
    .eq('venue_id', screen.venue_id)
    .eq('is_active', true)
    .single()

  let slotData = activeScene.data

  if (menu) {
    const { data: categories } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('menu_id', menu.id)
      .order('sort_order')

    const categoryIds = categories?.map((c: { id: string }) => c.id) ?? []

    const { data: items } = await supabase
      .from('menu_items')
      .select('*')
      .in('category_id', categoryIds)
      .order('sort_order')

    const itemIds = items?.map((i: { id: string }) => i.id) ?? []

    const [{ data: prices }, { data: allergens }] = await Promise.all([
      supabase.from('menu_item_prices').select('*').in('item_id', itemIds).order('sort_order'),
      supabase.from('menu_item_allergens').select('*').in('item_id', itemIds),
    ])

    const fullMenu: MenuWithItems = {
      ...menu,
      categories: (categories ?? []).map((cat: { id: string; [key: string]: unknown }) => ({
        ...cat,
        items: (items ?? [])
          .filter((i: { category_id: string }) => i.category_id === cat.id)
          .map((item: { id: string; [key: string]: unknown }) => ({
            ...item,
            prices: (prices ?? []).filter((p: { item_id: string }) => p.item_id === item.id),
            allergens: (allergens ?? []).filter((a: { item_id: string }) => a.item_id === item.id),
          })),
      })),
    }

    const venue = screen.venue
    const brandKit = venue.brand_kit

    if (venue && brandKit) {
      slotData = mapMenuToSlotData(fullMenu, venue, brandKit)
    }
  }

  return NextResponse.json({
    screen: {
      id: screen.id,
      orientation: screen.orientation,
      venue_id: screen.venue_id,
    },
    template: {
      slug: activeScene.template.slug,
    },
    slotData,
  })
}
