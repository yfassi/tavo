import { describe, it, expect } from 'vitest'
import { mapMenuToSlotData } from '@/lib/templates/data-mapper'
import type { MenuWithItems } from '@/lib/queries/menu'
import type { Venue, BrandKit } from '@/lib/types/brand'

const mockVenue: Venue = {
  id: '1',
  organization_id: '1',
  name: 'Test Restaurant',
  address: null,
  cuisine_type: null,
  timezone: 'Europe/Paris',
  public_slug: 'test',
  logo_url: null,
}

const mockBrandKit: BrandKit = {
  id: '1',
  venue_id: '1',
  primary_color: '#000000',
  secondary_color: null,
  accent_color: '#ff0000',
  font_heading: 'Inter',
  font_body: 'Inter',
  tone_of_voice: 'chaleureux',
}

const mockMenu: MenuWithItems = {
  id: '1',
  venue_id: '1',
  name: 'Carte',
  is_active: true,
  created_at: '',
  updated_at: '',
  categories: [
    {
      id: 'c1',
      menu_id: '1',
      name: 'Entrées',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      items: [
        {
          id: 'i1',
          category_id: 'c1',
          name: 'Soupe',
          description: 'Bonne soupe',
          is_available: true,
          is_daily_special: false,
          photo_asset_id: null,
          sort_order: 0,
          created_at: '',
          updated_at: '',
          prices: [
            {
              id: 'p1',
              item_id: 'i1',
              label: 'Seul',
              amount_cents: 750,
              tva_rate: 10,
              sort_order: 0,
            },
          ],
          allergens: [{ id: 'a1', item_id: 'i1', allergen: 'gluten', is_confirmed: true }],
        },
      ],
    },
  ],
}

describe('mapMenuToSlotData', () => {
  it('maps menu data to template slot format', () => {
    const result = mapMenuToSlotData(mockMenu, mockVenue, mockBrandKit)
    expect(result.venueName).toBe('Test Restaurant')
    expect(result.accentColor).toBe('#ff0000')
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].name).toBe('Entrées')
    expect(result.categories[0].items).toHaveLength(1)
    expect(result.categories[0].items[0].prices[0].amountCents).toBe(750)
    expect(result.categories[0].items[0].allergens).toEqual(['gluten'])
  })

  it('filters out unavailable items', () => {
    const menu = {
      ...mockMenu,
      categories: [
        {
          ...mockMenu.categories[0],
          items: [
            ...mockMenu.categories[0].items,
            {
              ...mockMenu.categories[0].items[0],
              id: 'i2',
              name: 'Hidden',
              is_available: false,
              prices: [],
              allergens: [],
            },
          ],
        },
      ],
    }
    const result = mapMenuToSlotData(menu, mockVenue, mockBrandKit)
    expect(result.categories[0].items).toHaveLength(1)
  })
})
