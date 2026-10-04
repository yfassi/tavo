export const ALLERGENS = [
  'gluten',
  'crustaces',
  'oeufs',
  'poissons',
  'arachides',
  'soja',
  'lait',
  'fruits_a_coque',
  'celeri',
  'moutarde',
  'sesame',
  'sulfites',
  'lupin',
  'mollusques',
] as const

export type Allergen = (typeof ALLERGENS)[number]

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaces: 'Crustacés',
  oeufs: 'Œufs',
  poissons: 'Poissons',
  arachides: 'Arachides',
  soja: 'Soja',
  lait: 'Lait',
  fruits_a_coque: 'Fruits à coque',
  celeri: 'Céleri',
  moutarde: 'Moutarde',
  sesame: 'Sésame',
  sulfites: 'Sulfites',
  lupin: 'Lupin',
  mollusques: 'Mollusques',
}

export interface MenuCategory {
  id: string
  menu_id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  is_available: boolean
  is_daily_special: boolean
  photo_asset_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
  prices?: MenuItemPrice[]
  allergens?: MenuItemAllergen[]
  photo_asset?: Asset | null
}

export interface MenuItemPrice {
  id: string
  item_id: string
  label: string
  amount_cents: number
  tva_rate: number
  sort_order: number
}

export interface MenuItemAllergen {
  id: string
  item_id: string
  allergen: Allergen
  is_confirmed: boolean
}

export interface Menu {
  id: string
  venue_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  categories?: MenuCategory[]
}

export interface Asset {
  id: string
  organization_id: string
  type: 'photo' | 'logo' | 'generated'
  original_url: string
  processed_url: string | null
  thumbnail_url: string | null
  filename: string | null
  mime_type: string | null
  width: number | null
  height: number | null
  has_background_removed: boolean
  rights_confirmed: boolean
  ai_generated: boolean
}
