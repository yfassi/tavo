import type { MenuWithItems } from '@/lib/queries/menu'
import type { Venue, BrandKit } from '@/lib/types/brand'
import type { TemplateSlotData } from '@/lib/types/template'
import type { MenuCategory, MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

type CategoryWithItems = MenuCategory & {
  items: (MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] })[]
}

export function mapMenuToSlotData(
  menu: MenuWithItems,
  venue: Venue,
  brandKit: BrandKit,
): TemplateSlotData {
  return {
    venueName: venue.name,
    logo: venue.logo_url ?? undefined,
    accentColor: brandKit.accent_color ?? brandKit.primary_color,
    categories: (menu.categories as CategoryWithItems[]).map((cat) => ({
      name: cat.name,
      items: cat.items
        .filter((item) => item.is_available)
        .map((item) => ({
          name: item.name,
          description: item.description ?? undefined,
          prices: item.prices.map((p) => ({
            label: p.label,
            amountCents: p.amount_cents,
          })),
          allergens: item.allergens.map((a) => a.allergen),
          isDailySpecial: item.is_daily_special || undefined,
          isAvailable: item.is_available,
        })),
    })),
  }
}
