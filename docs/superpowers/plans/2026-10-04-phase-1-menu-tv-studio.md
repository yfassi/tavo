# Phase 1: Menu + Templates + TV + Interactive Menu + Photo Studio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core product loop: restaurateur edits their menu → TV updates in real-time → interactive menu available via QR code → photo studio enhances dish photos.

**Architecture:** Menu editor uses Server Actions for mutations with optimistic UI. Templates are self-contained React components receiving data via Zod-validated props. TV player is a public page using Supabase Realtime for live updates and a Service Worker for offline resilience. Interactive menu is SSR+ISR. Photo studio uses an `ImageProvider` abstraction with a mock implementation for dev.

**Tech Stack:** Next.js 16, Supabase (Realtime, Storage), Zod, shadcn/ui, Workbox (Service Worker), `qrcode` (SVG generation).

## Global Constraints

- TypeScript strict mode (`"strict": true`)
- UI text in French (France), code and comments in English
- Package manager: pnpm
- Amounts stored as integer cents, displayed via `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`
- All DB mutations go through Server Actions or API routes, never direct client writes
- Zod for all external input validation
- Conventional Commits
- shadcn/ui uses `@base-ui/react` — use `render` prop, not `asChild`
- Existing interfaces: `createServerClient()` from `@/lib/supabase/server`, `createBrowserClient()` from `@/lib/supabase/client`, `getSession()` from `@/lib/auth/get-session`

---

### Task 1: Shared Types + Price Formatter

**Files:**
- Create: `src/lib/types/menu.ts`
- Create: `src/lib/types/template.ts`
- Create: `src/lib/types/brand.ts`
- Create: `src/lib/format.ts`
- Create: `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - Types: `Organization`, `Venue`, `BrandKit`, `Menu`, `MenuCategory`, `MenuItem`, `MenuItemPrice`, `MenuItemAllergen`, `Allergen`, `Asset`, `Screen`, `Scene`, `Schedule`, `Template`, `Subscription`, `CreditLedger`, `ImageJob`, `AiJob`
  - `ALLERGEN_LABELS: Record<Allergen, string>` — French labels for 14 EU allergens
  - `formatPrice(amountCents: number): string` — returns `"12,90 €"`
  - `formatPriceRaw(amountCents: number): string` — returns `"12,90"` (no symbol)

- [ ] **Step 1: Write failing test for formatPrice**

Create `tests/unit/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatPrice, formatPriceRaw } from '@/lib/format'

describe('formatPrice', () => {
  it('formats cents to EUR TTC French format', () => {
    expect(formatPrice(1290)).toBe('12,90\u00a0€')
  })

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0,00\u00a0€')
  })

  it('formats single digit cents', () => {
    expect(formatPrice(500)).toBe('5,00\u00a0€')
  })
})

describe('formatPriceRaw', () => {
  it('formats without currency symbol', () => {
    expect(formatPriceRaw(1290)).toBe('12,90')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test -- tests/unit/format.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement formatPrice**

Create `src/lib/format.ts`:

```ts
const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const rawFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(amountCents: number): string {
  return eurFormatter.format(amountCents / 100)
}

export function formatPriceRaw(amountCents: number): string {
  return rawFormatter.format(amountCents / 100)
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test -- tests/unit/format.test.ts
```

Expected: 4 tests passed.

- [ ] **Step 5: Create shared types**

Create `src/lib/types/menu.ts`:

```ts
export const ALLERGENS = [
  'gluten', 'crustaces', 'oeufs', 'poissons', 'arachides',
  'soja', 'lait', 'fruits_a_coque', 'celeri', 'moutarde',
  'sesame', 'sulfites', 'lupin', 'mollusques',
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
```

Create `src/lib/types/brand.ts`:

```ts
export interface BrandKit {
  id: string
  venue_id: string
  primary_color: string
  secondary_color: string | null
  accent_color: string | null
  font_heading: string
  font_body: string
  tone_of_voice: string
}

export interface Venue {
  id: string
  organization_id: string
  name: string
  address: string | null
  cuisine_type: string | null
  timezone: string
  public_slug: string | null
  logo_url: string | null
}

export interface Organization {
  id: string
  name: string
}
```

Create `src/lib/types/template.ts`:

```ts
import { z } from 'zod'

export interface TemplateManifest {
  slug: string
  name: string
  family: 'street' | 'bistrot'
  formats: ('landscape' | 'portrait')[]
  loopDurationMs: number
  maxItemsPerScreen: number
  colorVariants: {
    name: string
    tokens: Record<string, string>
  }[]
  version: number
}

export const templateSlotSchema = z.object({
  venueName: z.string(),
  logo: z.string().url().optional(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      prices: z.array(z.object({
        label: z.string(),
        amountCents: z.number(),
      })),
      photoUrl: z.string().url().optional(),
      allergens: z.array(z.string()).optional(),
      isDailySpecial: z.boolean().optional(),
      isAvailable: z.boolean().default(true),
    })),
  })),
})

export type TemplateSlotData = z.infer<typeof templateSlotSchema>

export interface TemplateProps {
  data: TemplateSlotData
  format: 'landscape' | 'portrait'
}
```

- [ ] **Step 6: Install zod**

```bash
pnpm add zod
```

- [ ] **Step 7: Verify all passes**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add shared types, allergen labels, and price formatter"
```

---

### Task 2: Menu Editor — Data Layer + Server Actions

**Files:**
- Create: `src/lib/actions/menu.ts`
- Create: `src/lib/queries/menu.ts`
- Create: `tests/unit/menu-queries.test.ts`

**Interfaces:**
- Consumes: `createServerClient()` from `@/lib/supabase/server`, types from Task 1
- Produces:
  - `getMenuWithItems(venueId: string): Promise<MenuWithItems | null>` — fetches the active menu with categories, items, prices, allergens
  - `createCategory(menuId: string, name: string): Promise<MenuCategory>`
  - `updateCategory(id: string, data: { name?: string; sort_order?: number }): Promise<void>`
  - `deleteCategory(id: string): Promise<void>`
  - `createItem(categoryId: string, data: CreateItemInput): Promise<MenuItem>`
  - `updateItem(id: string, data: UpdateItemInput): Promise<void>`
  - `deleteItem(id: string): Promise<void>`
  - `updatePrice(id: string, amountCents: number): Promise<void>`
  - `addPrice(itemId: string, label: string, amountCents: number): Promise<void>`
  - `deletePrice(id: string): Promise<void>`
  - `toggleAllergen(itemId: string, allergen: Allergen, confirmed: boolean): Promise<void>`
  - `toggleDailySpecial(itemId: string, isDailySpecial: boolean): Promise<void>`
  - `toggleAvailability(itemId: string, isAvailable: boolean): Promise<void>`
  - `reorderCategories(menuId: string, orderedIds: string[]): Promise<void>`
  - `reorderItems(categoryId: string, orderedIds: string[]): Promise<void>`
  - Type: `MenuWithItems = Menu & { categories: (MenuCategory & { items: (MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] })[] })[] }`

- [ ] **Step 1: Create the menu query function**

Create `src/lib/queries/menu.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'
import type { Menu, MenuCategory, MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

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
```

- [ ] **Step 2: Create menu server actions**

Create `src/lib/actions/menu.ts`:

```ts
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
  updates: { name?: string; description?: string | null; is_available?: boolean; is_daily_special?: boolean },
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
  const { error } = await supabase.from('menu_item_prices').update({ amount_cents: amountCents }).eq('id', id)
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
  const { error } = await supabase.from('menu_item_allergens').update({ is_confirmed: isConfirmed }).eq('id', id)
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
```

- [ ] **Step 3: Verify typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add menu data layer with queries and server actions"
```

---

### Task 3: Menu Editor — UI Components

**Files:**
- Create: `src/app/(dashboard)/carte/page.tsx` (replace placeholder)
- Create: `src/components/carte/category-section.tsx`
- Create: `src/components/carte/item-row.tsx`
- Create: `src/components/carte/add-item-dialog.tsx`
- Create: `src/components/carte/add-category-dialog.tsx`
- Create: `src/components/carte/allergen-picker.tsx`
- Create: `src/components/carte/price-editor.tsx`

**Interfaces:**
- Consumes: `getMenuWithItems()` from `@/lib/queries/menu`, all server actions from `@/lib/actions/menu`, `getSession()` from `@/lib/auth/get-session`, `formatPrice()` from `@/lib/format`, types from Task 1, shadcn/ui components
- Produces: working `/carte` page where the restaurateur can view and edit their menu (categories, items, prices, allergens, availability, daily special)

Additional shadcn/ui components needed: `dialog`, `select`, `checkbox`, `switch`, `badge`, `textarea`, `tabs`, `toast/sonner`. Install them first.

- [ ] **Step 1: Install additional shadcn/ui components and sonner**

```bash
pnpm dlx shadcn@latest add dialog select checkbox switch badge textarea tabs --yes
pnpm add sonner
```

- [ ] **Step 2: Create the allergen picker component**

Create `src/components/carte/allergen-picker.tsx`:

```tsx
'use client'

import { ALLERGENS, ALLERGEN_LABELS, type Allergen, type MenuItemAllergen } from '@/lib/types/menu'
import { toggleAllergen, confirmAllergen } from '@/lib/actions/menu'
import { Badge } from '@/components/ui/badge'
import { useTransition } from 'react'

export function AllergenPicker({
  itemId,
  allergens,
}: {
  itemId: string
  allergens: MenuItemAllergen[]
}) {
  const [isPending, startTransition] = useTransition()

  const activeAllergens = new Set(allergens.map((a) => a.allergen))

  function handleToggle(allergen: Allergen) {
    startTransition(() => {
      toggleAllergen(itemId, allergen, true)
    })
  }

  function handleConfirm(id: string, isConfirmed: boolean) {
    startTransition(() => {
      confirmAllergen(id, isConfirmed)
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALLERGENS.map((allergen) => {
        const existing = allergens.find((a) => a.allergen === allergen)
        const isActive = activeAllergens.has(allergen)

        return (
          <Badge
            key={allergen}
            variant={isActive ? (existing?.is_confirmed ? 'default' : 'secondary') : 'outline'}
            className={`cursor-pointer text-xs ${isPending ? 'opacity-50' : ''} ${
              isActive && !existing?.is_confirmed ? 'border-yellow-500' : ''
            }`}
            onClick={() => {
              if (isActive && existing && !existing.is_confirmed) {
                handleConfirm(existing.id, true)
              } else {
                handleToggle(allergen)
              }
            }}
          >
            {ALLERGEN_LABELS[allergen]}
            {isActive && !existing?.is_confirmed && ' ?'}
          </Badge>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create the price editor component**

Create `src/components/carte/price-editor.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updatePrice, addPrice, deletePrice } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPriceRaw } from '@/lib/format'
import type { MenuItemPrice } from '@/lib/types/menu'
import { Trash2, Plus } from 'lucide-react'

export function PriceEditor({ itemId, prices }: { itemId: string; prices: MenuItemPrice[] }) {
  const [isPending, startTransition] = useTransition()
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')

  function handleUpdatePrice(priceId: string, rawValue: string) {
    const cents = Math.round(parseFloat(rawValue.replace(',', '.')) * 100)
    if (isNaN(cents) || cents < 0) return
    startTransition(() => {
      updatePrice(priceId, cents)
    })
  }

  function handleAddPrice() {
    const cents = Math.round(parseFloat(newAmount.replace(',', '.')) * 100)
    if (isNaN(cents) || cents < 0 || !newLabel.trim()) return
    startTransition(() => {
      addPrice(itemId, newLabel.trim(), cents)
    })
    setNewLabel('')
    setNewAmount('')
  }

  function handleDeletePrice(priceId: string) {
    startTransition(() => {
      deletePrice(priceId)
    })
  }

  return (
    <div className={`space-y-2 ${isPending ? 'opacity-50' : ''}`}>
      {prices.map((price) => (
        <div key={price.id} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">{price.label}</span>
          <Input
            className="w-24"
            defaultValue={formatPriceRaw(price.amount_cents)}
            onBlur={(e) => handleUpdatePrice(price.id, e.target.value)}
          />
          <span className="text-sm text-muted-foreground">€</span>
          {prices.length > 1 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeletePrice(price.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input className="w-16" placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <Input className="w-24" placeholder="0,00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddPrice} disabled={!newLabel || !newAmount}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the item row component**

Create `src/components/carte/item-row.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateItem, deleteItem } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Star } from 'lucide-react'
import { PriceEditor } from './price-editor'
import { AllergenPicker } from './allergen-picker'
import { formatPrice } from '@/lib/format'
import type { MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

interface ItemRowProps {
  item: MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] }
}

export function ItemRow({ item }: ItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleNameBlur(value: string) {
    if (value !== item.name) {
      startTransition(() => updateItem(item.id, { name: value }))
    }
  }

  function handleDescriptionBlur(value: string) {
    const desc = value || null
    if (desc !== item.description) {
      startTransition(() => updateItem(item.id, { description: desc }))
    }
  }

  function handleToggleAvailability() {
    startTransition(() => updateItem(item.id, { is_available: !item.is_available }))
  }

  function handleToggleDailySpecial() {
    startTransition(() => updateItem(item.id, { is_daily_special: !item.is_daily_special }))
  }

  function handleDelete() {
    if (confirm('Supprimer ce plat ?')) {
      startTransition(() => deleteItem(item.id))
    }
  }

  const mainPrice = item.prices[0]

  return (
    <div className={`rounded-lg border p-3 ${!item.is_available ? 'opacity-50' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.is_daily_special && (
              <Badge variant="secondary" className="text-xs">
                <Star className="mr-1 h-3 w-3" /> Plat du jour
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className="text-right">
          {mainPrice && <span className="font-medium">{formatPrice(mainPrice.amount_cents)}</span>}
          {item.prices.length > 1 && (
            <span className="ml-1 text-xs text-muted-foreground">+{item.prices.length - 1}</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid gap-3">
            <Input defaultValue={item.name} onBlur={(e) => handleNameBlur(e.target.value)} placeholder="Nom du plat" />
            <Input defaultValue={item.description ?? ''} onBlur={(e) => handleDescriptionBlur(e.target.value)} placeholder="Description (optionnel)" />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Prix</p>
            <PriceEditor itemId={item.id} prices={item.prices} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Allergènes</p>
            <AllergenPicker itemId={item.id} allergens={item.allergens} />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={item.is_available} onCheckedChange={handleToggleAvailability} />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={item.is_daily_special} onCheckedChange={handleToggleDailySpecial} />
              Plat du jour
            </label>
          </div>

          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create the add item dialog**

Create `src/components/carte/add-item-dialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createItem } from '@/lib/actions/menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function AddItemDialog({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(price.replace(',', '.')) * 100)
    if (isNaN(cents) || !name.trim()) return

    startTransition(async () => {
      await createItem(categoryId, {
        name: name.trim(),
        description: description.trim() || undefined,
        prices: [{ label: 'Seul', amountCents: cents }],
      })
      setName('')
      setDescription('')
      setPrice('')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" /> Ajouter un plat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau plat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Nom</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">Description (optionnel)</Label>
            <Input id="item-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-price">Prix (€)</Label>
            <Input id="item-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12,90" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: Create the add category dialog**

Create `src/components/carte/add-category-dialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createCategory } from '@/lib/actions/menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function AddCategoryDialog({ menuId }: { menuId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      await createCategory(menuId, name.trim())
      setName('')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Ajouter une catégorie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nom</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Entrées, Plats, Desserts..." required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: Create the category section component**

Create `src/components/carte/category-section.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateCategory, deleteCategory } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { ItemRow } from './item-row'
import { AddItemDialog } from './add-item-dialog'
import type { MenuCategory, MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

interface CategorySectionProps {
  category: MenuCategory & {
    items: (MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] })[]
  }
}

export function CategorySection({ category }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isPending, startTransition] = useTransition()

  function handleNameBlur(value: string) {
    if (value !== category.name) {
      startTransition(() => updateCategory(category.id, { name: value }))
    }
  }

  function handleDelete() {
    if (confirm(`Supprimer la catégorie "${category.name}" et tous ses plats ?`)) {
      startTransition(() => deleteCategory(category.id))
    }
  }

  return (
    <div className={`rounded-xl border bg-card ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 p-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <Input
          className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          defaultValue={category.name}
          onBlur={(e) => handleNameBlur(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">{category.items.length} plat{category.items.length > 1 ? 's' : ''}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-2 px-4 pb-4">
          {category.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          <AddItemDialog categoryId={category.id} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Replace the carte page**

Replace `src/app/(dashboard)/carte/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems } from '@/lib/queries/menu'
import { CategorySection } from '@/components/carte/category-section'
import { AddCategoryDialog } from '@/components/carte/add-category-dialog'

export default async function CartePage() {
  const { venue } = await getSession()

  if (!venue) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Carte</h1>
        <p className="mt-2 text-muted-foreground">Aucun établissement configuré.</p>
      </div>
    )
  }

  const menu = await getMenuWithItems(venue.id)

  if (!menu) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Carte</h1>
        <p className="mt-2 text-muted-foreground">Aucune carte active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carte</h1>
        <AddCategoryDialog menuId={menu.id} />
      </div>

      <div className="space-y-4">
        {menu.categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>

      {menu.categories.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          Votre carte est vide. Ajoutez une catégorie pour commencer.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Verify typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add menu editor with categories, items, prices, and allergens"
```

---

### Task 4: Brand Kit Editor

**Files:**
- Create: `src/lib/actions/brand.ts`
- Create: `src/lib/queries/brand.ts`
- Create: `src/app/(dashboard)/parametres/page.tsx`
- Create: `src/components/parametres/brand-kit-form.tsx`

**Interfaces:**
- Consumes: `createServerClient()`, `getSession()`, types from Task 1
- Produces:
  - `getBrandKit(venueId: string): Promise<BrandKit | null>`
  - `updateBrandKit(id: string, data: Partial<BrandKit>): Promise<void>`
  - `updateVenueLogo(venueId: string, logoUrl: string): Promise<void>`
  - Working `/parametres` page with brand kit form (colors, fonts, logo upload)

- [ ] **Step 1: Create brand queries and actions**

Create `src/lib/queries/brand.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'
import type { BrandKit } from '@/lib/types/brand'

export async function getBrandKit(venueId: string): Promise<BrandKit | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('venue_id', venueId)
    .single()
  return data
}
```

Create `src/lib/actions/brand.ts`:

```ts
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

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)

  const { error } = await supabase
    .from('venues')
    .update({ logo_url: publicUrl })
    .eq('id', venueId)

  if (error) throw new Error(error.message)
  revalidatePath('/parametres')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}
```

- [ ] **Step 2: Create brand kit form component**

Create `src/components/parametres/brand-kit-form.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { updateBrandKit, uploadLogo } from '@/lib/actions/brand'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BrandKit } from '@/lib/types/brand'

const ALLOWED_FONTS = ['Inter', 'Playfair Display', 'Lora', 'Montserrat', 'Raleway', 'Roboto Slab']

export function BrandKitForm({
  brandKit,
  venueId,
  logoUrl,
}: {
  brandKit: BrandKit
  venueId: string
  logoUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleColorChange(field: string, value: string) {
    startTransition(() => {
      updateBrandKit(brandKit.id, { [field]: value })
    })
  }

  function handleFontChange(field: string, value: string) {
    startTransition(() => {
      updateBrandKit(brandKit.id, { [field]: value })
    })
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('logo', file)
    startTransition(() => {
      uploadLogo(venueId, formData)
    })
  }

  return (
    <Card className={isPending ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle>Identité visuelle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Couleur principale</Label>
            <Input type="color" defaultValue={brandKit.primary_color} onBlur={(e) => handleColorChange('primary_color', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Couleur secondaire</Label>
            <Input type="color" defaultValue={brandKit.secondary_color ?? '#f5f0e8'} onBlur={(e) => handleColorChange('secondary_color', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Couleur d&apos;accent</Label>
            <Input type="color" defaultValue={brandKit.accent_color ?? '#c2185b'} onBlur={(e) => handleColorChange('accent_color', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Police titres</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue={brandKit.font_heading}
              onChange={(e) => handleFontChange('font_heading', e.target.value)}
            >
              {ALLOWED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Police corps</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue={brandKit.font_body}
              onChange={(e) => handleFontChange('font_body', e.target.value)}
            >
              {ALLOWED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border" />
            )}
            <Input type="file" accept="image/*" onChange={handleLogoUpload} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create the parametres page**

Create `src/app/(dashboard)/parametres/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getBrandKit } from '@/lib/queries/brand'
import { BrandKitForm } from '@/components/parametres/brand-kit-form'

export default async function ParametresPage() {
  const { venue } = await getSession()

  if (!venue) {
    return <p className="text-muted-foreground">Aucun établissement configuré.</p>
  }

  const brandKit = await getBrandKit(venue.id)

  if (!brandKit) {
    return <p className="text-muted-foreground">Brand kit non trouvé.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <BrandKitForm brandKit={brandKit} venueId={venue.id} logoUrl={venue.logo_url} />
    </div>
  )
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "feat: add brand kit editor with colors, fonts, and logo upload"
```

---

### Task 5: Template System + 2 Templates (Street-01, Bistrot-01)

**Files:**
- Create: `templates/_registry.ts`
- Create: `templates/_types.ts`
- Create: `templates/street-01/manifest.json`
- Create: `templates/street-01/schema.ts`
- Create: `templates/street-01/Template.tsx`
- Create: `templates/street-01/Template.module.css`
- Create: `templates/bistrot-01/manifest.json`
- Create: `templates/bistrot-01/schema.ts`
- Create: `templates/bistrot-01/Template.tsx`
- Create: `templates/bistrot-01/Template.module.css`
- Create: `src/lib/templates/registry.ts`
- Create: `src/lib/templates/data-mapper.ts`
- Create: `src/components/templates/template-renderer.tsx`
- Create: `tests/unit/data-mapper.test.ts`

**Interfaces:**
- Consumes: `TemplateSlotData`, `TemplateProps`, `templateSlotSchema` from Task 1 types, `MenuWithItems` from Task 2, `BrandKit` from Task 1 types
- Produces:
  - `getTemplate(slug: string): TemplateModule | undefined`
  - `getAllTemplates(): TemplateModule[]`
  - `mapMenuToSlotData(menu: MenuWithItems, venue: Venue, brandKit: BrandKit): TemplateSlotData`
  - `<TemplateRenderer slug={string} data={TemplateSlotData} format="landscape"|"portrait" />`

This task creates the two initial templates. Each template is a self-contained React component inside a container-query box. Animations use CSS only (transform + opacity). The templates render menu data in a visually distinct style.

- [ ] **Step 1: Write test for data mapper**

Create `tests/unit/data-mapper.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapMenuToSlotData } from '@/lib/templates/data-mapper'
import type { MenuWithItems } from '@/lib/queries/menu'
import type { Venue, BrandKit } from '@/lib/types/brand'

const mockVenue: Venue = {
  id: '1', organization_id: '1', name: 'Test Restaurant',
  address: null, cuisine_type: null, timezone: 'Europe/Paris',
  public_slug: 'test', logo_url: null,
}

const mockBrandKit: BrandKit = {
  id: '1', venue_id: '1', primary_color: '#000000',
  secondary_color: null, accent_color: '#ff0000',
  font_heading: 'Inter', font_body: 'Inter', tone_of_voice: 'chaleureux',
}

const mockMenu: MenuWithItems = {
  id: '1', venue_id: '1', name: 'Carte', is_active: true,
  created_at: '', updated_at: '',
  categories: [{
    id: 'c1', menu_id: '1', name: 'Entrées', sort_order: 0,
    created_at: '', updated_at: '',
    items: [{
      id: 'i1', category_id: 'c1', name: 'Soupe',
      description: 'Bonne soupe', is_available: true,
      is_daily_special: false, photo_asset_id: null, sort_order: 0,
      created_at: '', updated_at: '',
      prices: [{ id: 'p1', item_id: 'i1', label: 'Seul', amount_cents: 750, tva_rate: 10, sort_order: 0 }],
      allergens: [{ id: 'a1', item_id: 'i1', allergen: 'gluten', is_confirmed: true }],
    }],
  }],
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
      categories: [{
        ...mockMenu.categories[0],
        items: [
          ...mockMenu.categories[0].items,
          {
            ...mockMenu.categories[0].items[0],
            id: 'i2', name: 'Hidden', is_available: false,
            prices: [], allergens: [],
          },
        ],
      }],
    }
    const result = mapMenuToSlotData(menu, mockVenue, mockBrandKit)
    expect(result.categories[0].items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test -- tests/unit/data-mapper.test.ts
```

- [ ] **Step 3: Implement data mapper**

Create `src/lib/templates/data-mapper.ts`:

```ts
import type { MenuWithItems } from '@/lib/queries/menu'
import type { Venue, BrandKit } from '@/lib/types/brand'
import type { TemplateSlotData } from '@/lib/types/template'

export function mapMenuToSlotData(
  menu: MenuWithItems,
  venue: Venue,
  brandKit: BrandKit,
): TemplateSlotData {
  return {
    venueName: venue.name,
    logo: venue.logo_url ?? undefined,
    accentColor: brandKit.accent_color ?? brandKit.primary_color,
    categories: menu.categories.map((cat) => ({
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test -- tests/unit/data-mapper.test.ts
```

- [ ] **Step 5: Create the Street-01 template**

Create `templates/street-01/manifest.json`:

```json
{
  "slug": "street-01",
  "name": "Street Bold",
  "family": "street",
  "formats": ["landscape", "portrait"],
  "loopDurationMs": 30000,
  "maxItemsPerScreen": 8,
  "colorVariants": [
    { "name": "Sombre", "tokens": { "bg": "#1a1a1a", "text": "#ffffff", "accent": "#ff6b35" } },
    { "name": "Clair", "tokens": { "bg": "#f5f0e8", "text": "#1a1a1a", "accent": "#d4380d" } }
  ],
  "version": 1
}
```

Create `templates/street-01/schema.ts`:

```ts
export { templateSlotSchema } from '@/lib/types/template'
```

Create `templates/street-01/Template.module.css`:

```css
.container {
  container-type: size;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wrapper {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  font-family: var(--font-body, 'Inter', sans-serif);
  color: var(--color-text);
  background: var(--color-bg);
}

.header {
  display: flex;
  align-items: center;
  gap: 2cqw;
  padding: 2cqh 3cqw;
  border-bottom: 0.4cqh solid var(--color-accent);
}

.logo {
  width: 6cqw;
  height: 6cqw;
  object-fit: contain;
  border-radius: 0.5cqw;
}

.venueName {
  font-family: var(--font-heading, 'Inter', sans-serif);
  font-size: 3.5cqw;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2cqw;
  padding: 2cqh 3cqw;
  overflow: hidden;
}

.category {
  animation: fadeIn 0.6s ease-out both;
}

.categoryName {
  font-family: var(--font-heading, 'Inter', sans-serif);
  font-size: 2.2cqw;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 1cqh;
  letter-spacing: 0.08em;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.6cqh 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
}

.itemName {
  font-size: 1.8cqw;
  font-weight: 600;
}

.itemPrice {
  font-size: 1.8cqw;
  font-weight: 700;
  color: var(--color-accent);
  white-space: nowrap;
}

.dailySpecial {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  padding: 0.4cqh 0.8cqw;
  border-radius: 0.4cqw;
  border-left: 0.3cqw solid var(--color-accent);
}

.placeholder {
  width: 4cqw;
  height: 4cqw;
  border-radius: 0.5cqw;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 20%, transparent), color-mix(in srgb, var(--color-accent) 5%, transparent));
  flex-shrink: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(1cqh); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .category { animation: none; }
}
```

Create `templates/street-01/Template.tsx`:

```tsx
import type { TemplateProps } from '@/lib/types/template'
import { formatPrice } from '@/lib/format'
import styles from './Template.module.css'

export function StreetBoldTemplate({ data, format }: TemplateProps) {
  const style = {
    '--color-bg': '#1a1a1a',
    '--color-text': '#ffffff',
    '--color-accent': data.accentColor,
    '--font-heading': 'Inter, sans-serif',
    '--font-body': 'Inter, sans-serif',
  } as React.CSSProperties

  const maxItems = format === 'landscape' ? 8 : 6

  return (
    <div className={styles.container}>
      <div className={styles.wrapper} style={style}>
        <div className={styles.header}>
          {data.logo && <img className={styles.logo} src={data.logo} alt="" />}
          <span className={styles.venueName}>{data.venueName}</span>
        </div>

        <div className={styles.content}>
          {data.categories.map((cat, ci) => {
            const visibleItems = cat.items.slice(0, maxItems)
            return (
              <div
                key={ci}
                className={styles.category}
                style={{ animationDelay: `${ci * 0.15}s` }}
              >
                <div className={styles.categoryName}>{cat.name}</div>
                {visibleItems.map((item, ii) => (
                  <div
                    key={ii}
                    className={`${styles.item} ${item.isDailySpecial ? styles.dailySpecial : ''}`}
                  >
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemPrice}>
                      {item.prices[0] && formatPrice(item.prices[0].amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create the Bistrot-01 template**

Create `templates/bistrot-01/manifest.json`:

```json
{
  "slug": "bistrot-01",
  "name": "Bistrot Ardoise",
  "family": "bistrot",
  "formats": ["landscape", "portrait"],
  "loopDurationMs": 30000,
  "maxItemsPerScreen": 8,
  "colorVariants": [
    { "name": "Ardoise", "tokens": { "bg": "#2d2d2d", "text": "#f5f0e8", "accent": "#c2185b" } },
    { "name": "Crème", "tokens": { "bg": "#f5f0e8", "text": "#2d2d2d", "accent": "#8b4513" } }
  ],
  "version": 1
}
```

Create `templates/bistrot-01/schema.ts`:

```ts
export { templateSlotSchema } from '@/lib/types/template'
```

Create `templates/bistrot-01/Template.module.css`:

```css
.container {
  container-type: size;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-body, 'Lora', serif);
  color: var(--color-text);
  background: var(--color-bg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2cqw;
  padding: 3cqh 3cqw 2cqh;
}

.logo {
  width: 5cqw;
  height: 5cqw;
  object-fit: contain;
}

.venueName {
  font-family: var(--font-heading, 'Playfair Display', serif);
  font-size: 3.5cqw;
  font-weight: 700;
  font-style: italic;
}

.divider {
  height: 1px;
  margin: 0 8cqw;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-accent),
    transparent
  );
}

.content {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 4cqw;
  padding: 2cqh 4cqw;
  overflow: hidden;
}

.category {
  margin-bottom: 2cqh;
  animation: slideIn 0.5s ease-out both;
}

.categoryName {
  font-family: var(--font-heading, 'Playfair Display', serif);
  font-size: 2cqw;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-accent);
  margin-bottom: 1cqh;
  text-align: center;
}

.categoryDivider {
  width: 6cqw;
  height: 1px;
  background: var(--color-accent);
  margin: 0 auto 1cqh;
}

.item {
  padding: 0.5cqh 0;
}

.itemHeader {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1cqw;
}

.itemName {
  font-size: 1.6cqw;
  font-weight: 600;
}

.itemDots {
  flex: 1;
  border-bottom: 1px dotted color-mix(in srgb, var(--color-text) 30%, transparent);
  margin-bottom: 0.3cqh;
}

.itemPrice {
  font-size: 1.6cqw;
  font-weight: 700;
  white-space: nowrap;
}

.itemDescription {
  font-size: 1.2cqw;
  font-style: italic;
  opacity: 0.7;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dailySpecial {
  position: relative;
  padding-left: 1cqw;
  border-left: 0.2cqw solid var(--color-accent);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-1cqw); }
  to { opacity: 1; transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .category { animation: none; }
}
```

Create `templates/bistrot-01/Template.tsx`:

```tsx
import type { TemplateProps } from '@/lib/types/template'
import { formatPrice } from '@/lib/format'
import styles from './Template.module.css'

export function BistrotArdoiseTemplate({ data, format }: TemplateProps) {
  const style = {
    '--color-bg': '#2d2d2d',
    '--color-text': '#f5f0e8',
    '--color-accent': data.accentColor,
    '--font-heading': "'Playfair Display', serif",
    '--font-body': "'Lora', serif",
  } as React.CSSProperties

  const maxItems = format === 'landscape' ? 8 : 6

  return (
    <div className={styles.container}>
      <div className={styles.wrapper} style={style}>
        <div className={styles.header}>
          {data.logo && <img className={styles.logo} src={data.logo} alt="" />}
          <span className={styles.venueName}>{data.venueName}</span>
        </div>
        <div className={styles.divider} />

        <div className={styles.content}>
          {data.categories.map((cat, ci) => {
            const visibleItems = cat.items.slice(0, maxItems)
            return (
              <div
                key={ci}
                className={styles.category}
                style={{ animationDelay: `${ci * 0.2}s` }}
              >
                <div className={styles.categoryName}>{cat.name}</div>
                <div className={styles.categoryDivider} />
                {visibleItems.map((item, ii) => (
                  <div
                    key={ii}
                    className={`${styles.item} ${item.isDailySpecial ? styles.dailySpecial : ''}`}
                  >
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemDots} />
                      <span className={styles.itemPrice}>
                        {item.prices[0] && formatPrice(item.prices[0].amountCents)}
                      </span>
                    </div>
                    {item.description && (
                      <div className={styles.itemDescription}>{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create the template registry**

Create `src/lib/templates/registry.ts`:

```ts
import type { TemplateManifest, TemplateProps } from '@/lib/types/template'
import type { ComponentType } from 'react'

import streetManifest from '../../../templates/street-01/manifest.json'
import bistrotManifest from '../../../templates/bistrot-01/manifest.json'
import { StreetBoldTemplate } from '../../../templates/street-01/Template'
import { BistrotArdoiseTemplate } from '../../../templates/bistrot-01/Template'

export interface TemplateModule {
  manifest: TemplateManifest
  Component: ComponentType<TemplateProps>
}

const registry: Record<string, TemplateModule> = {
  'street-01': { manifest: streetManifest as TemplateManifest, Component: StreetBoldTemplate },
  'bistrot-01': { manifest: bistrotManifest as TemplateManifest, Component: BistrotArdoiseTemplate },
}

export function getTemplate(slug: string): TemplateModule | undefined {
  return registry[slug]
}

export function getAllTemplates(): TemplateModule[] {
  return Object.values(registry)
}
```

- [ ] **Step 8: Create the TemplateRenderer component**

Create `src/components/templates/template-renderer.tsx`:

```tsx
import { getTemplate } from '@/lib/templates/registry'
import type { TemplateSlotData } from '@/lib/types/template'

interface TemplateRendererProps {
  slug: string
  data: TemplateSlotData
  format: 'landscape' | 'portrait'
}

export function TemplateRenderer({ slug, data, format }: TemplateRendererProps) {
  const template = getTemplate(slug)

  if (!template) {
    return <div className="flex h-full items-center justify-center text-red-500">Template &quot;{slug}&quot; introuvable</div>
  }

  const { Component } = template
  const aspectRatio = format === 'landscape' ? '16/9' : '9/16'

  return (
    <div style={{ aspectRatio, width: '100%', position: 'relative' }}>
      <Component data={data} format={format} />
    </div>
  )
}
```

- [ ] **Step 9: Enable resolveJsonModule in tsconfig if needed, verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add template system with Street-01 and Bistrot-01 templates"
```

---

### Task 6: TV Player (`/tv/[token]`)

**Files:**
- Create: `src/app/tv/[token]/page.tsx`
- Create: `src/app/tv/[token]/layout.tsx`
- Create: `src/components/tv/tv-player.tsx`
- Create: `src/app/api/tv/heartbeat/route.ts`
- Create: `src/app/api/tv/data/[tokenHash]/route.ts`
- Create: `public/sw.js` (service worker)

**Interfaces:**
- Consumes: `TemplateRenderer` from Task 5, `mapMenuToSlotData` from Task 5, `createServerClient()`, Supabase Realtime
- Produces:
  - Public page `/tv/[token]` that displays the scheduled template with live menu data
  - API route `/api/tv/heartbeat` — POST with `{ tokenHash }` updates `screens.last_seen_at`
  - API route `/api/tv/data/[tokenHash]` — GET returns `{ screen, scene, template, slotData }`
  - Service worker at `/sw.js` caching API responses for offline resilience

- [ ] **Step 1: Create the TV data API route**

Create `src/app/api/tv/data/[tokenHash]/route.ts`:

```ts
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

    const categoryIds = categories?.map((c) => c.id) ?? []

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

    const fullMenu: MenuWithItems = {
      ...menu,
      categories: (categories ?? []).map((cat) => ({
        ...cat,
        items: (items ?? [])
          .filter((i) => i.category_id === cat.id)
          .map((item) => ({
            ...item,
            prices: (prices ?? []).filter((p) => p.item_id === item.id),
            allergens: (allergens ?? []).filter((a) => a.item_id === item.id),
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
```

- [ ] **Step 2: Create the heartbeat API route**

Create `src/app/api/tv/heartbeat/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const { tokenHash } = await request.json()

  if (!tokenHash) {
    return NextResponse.json({ error: 'Missing tokenHash' }, { status: 400 })
  }

  const { error } = await supabase
    .from('screens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)

  if (error) {
    return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create the TV player client component**

Create `src/components/tv/tv-player.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { TemplateRenderer } from '@/components/templates/template-renderer'
import { createBrowserClient } from '@/lib/supabase/client'
import type { TemplateSlotData } from '@/lib/types/template'

interface TVPlayerProps {
  tokenHash: string
  venueId: string
  initialData: {
    template: { slug: string }
    slotData: TemplateSlotData
    screen: { orientation: string }
  }
}

export function TVPlayer({ tokenHash, venueId, initialData }: TVPlayerProps) {
  const [data, setData] = useState(initialData)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tv/data/${tokenHash}`)
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
      }
    } catch {
      // Offline — keep cached data
    }
  }, [tokenHash])

  // Supabase Realtime — listen for menu/venue changes
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`venue:${venueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_item_prices' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brand_kits' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        () => fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueId, fetchData])

  // Heartbeat — every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/tv/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash }),
      }).catch(() => {})
    }, 60000)

    // Initial heartbeat
    fetch('/api/tv/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenHash }),
    }).catch(() => {})

    return () => clearInterval(interval)
  }, [tokenHash])

  // Wake Lock — prevent screen sleep
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    requestWakeLock()

    // Re-acquire on visibility change
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
    }
  }, [])

  const format = data.screen.orientation === 'portrait' ? 'portrait' : 'landscape'

  return (
    <div className="h-screen w-screen bg-black">
      <TemplateRenderer
        slug={data.template.slug}
        data={data.slotData}
        format={format as 'landscape' | 'portrait'}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create the TV player page and layout**

Create `src/app/tv/[token]/layout.tsx`:

```tsx
export default function TVLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Create `src/app/tv/[token]/page.tsx`:

```tsx
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { TVPlayer } from '@/components/tv/tv-player'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function TVPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Fetch initial data via API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/tv/data/${tokenHash}`, { cache: 'no-store' })

  if (!res.ok) {
    notFound()
  }

  const data = await res.json()

  // Get venue_id for Realtime channel
  const { data: screen } = await supabase
    .from('screens')
    .select('venue_id')
    .eq('token_hash', tokenHash)
    .single()

  if (!screen) notFound()

  return <TVPlayer tokenHash={tokenHash} venueId={screen.venue_id} initialData={data} />
}
```

- [ ] **Step 5: Create the service worker for offline**

Create `public/sw.js`:

```js
const CACHE_NAME = 'tavo-tv-v1'
const API_CACHE = 'tavo-tv-api-v1'

// Cache static assets on install
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only cache TV-related requests
  if (!url.pathname.startsWith('/tv/') && !url.pathname.startsWith('/api/tv/')) {
    return
  }

  // For API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/tv/data/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)

        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
          .catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }

  // For other TV assets: cache-first
  if (url.pathname.startsWith('/tv/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
  }
})
```

- [ ] **Step 6: Register the service worker from the TV player**

Add to `src/components/tv/tv-player.tsx` — inside the component, add another `useEffect`:

```tsx
// Register service worker for offline support
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}, [])
```

- [ ] **Step 7: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add TV player with real-time updates, heartbeat, and offline support"
```

---

### Task 7: Interactive Menu (`/m/[slug]`) + QR Code

**Files:**
- Create: `src/app/m/[slug]/page.tsx`
- Create: `src/app/m/[slug]/layout.tsx`
- Create: `src/components/menu/menu-page.tsx`
- Create: `src/components/menu/allergen-filter.tsx`
- Create: `src/app/(dashboard)/parametres/qr-code/page.tsx`
- Create: `src/components/parametres/qr-code-display.tsx`

**Interfaces:**
- Consumes: `createServerClient()`, types from Task 1, `formatPrice()` from Task 1, `ALLERGEN_LABELS` from Task 1
- Produces:
  - Public page `/m/[slug]` — SSR+ISR, zero JS accordions, allergen filter, styled with brand kit
  - Dashboard page `/parametres/qr-code` — displays QR code for the venue's menu URL with download

- [ ] **Step 1: Install qrcode package**

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: Create the interactive menu layout**

Create `src/app/m/[slug]/layout.tsx`:

```tsx
export const revalidate = 60

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: Create the interactive menu page**

Create `src/app/m/[slug]/page.tsx`:

```tsx
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/format'
import { ALLERGEN_LABELS, type Allergen } from '@/lib/types/menu'
import type { Metadata } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data: venue } = await supabase
    .from('venues')
    .select('name, cuisine_type')
    .eq('public_slug', slug)
    .single()

  if (!venue) return { title: 'Menu introuvable' }

  return {
    title: `${venue.name} — Carte`,
    description: `Découvrez la carte de ${venue.name}${venue.cuisine_type ? ` — ${venue.cuisine_type}` : ''}`,
  }
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: venue } = await supabase
    .from('venues')
    .select('*, brand_kit:brand_kits(*)')
    .eq('public_slug', slug)
    .single()

  if (!venue) notFound()

  const brandKit = venue.brand_kit

  const { data: menu } = await supabase
    .from('menus')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('is_active', true)
    .single()

  if (!menu) notFound()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('menu_id', menu.id)
    .order('sort_order')

  const categoryIds = categories?.map((c) => c.id) ?? []

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categoryIds)
    .eq('is_available', true)
    .order('sort_order')

  const itemIds = items?.map((i) => i.id) ?? []

  const [{ data: prices }, { data: allergens }] = await Promise.all([
    supabase.from('menu_item_prices').select('*').in('item_id', itemIds).order('sort_order'),
    supabase.from('menu_item_allergens').select('*').in('item_id', itemIds),
  ])

  const accentColor = brandKit?.accent_color || '#000000'
  const primaryColor = brandKit?.primary_color || '#000000'

  // Collect all allergens present in the menu for the filter
  const allAllergens = [...new Set((allergens ?? []).map((a) => a.allergen))] as Allergen[]

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: `${brandKit?.font_body || 'Inter'}, sans-serif`,
        background: '#fafafa',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-4 text-white"
        style={{ background: primaryColor }}
      >
        <div className="mx-auto max-w-lg flex items-center gap-3">
          {venue.logo_url && (
            <img src={venue.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
          )}
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: `${brandKit?.font_heading || 'Inter'}, sans-serif` }}
          >
            {venue.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Daily special */}
        {items?.filter((i) => i.is_daily_special).map((special) => {
          const itemPrices = (prices ?? []).filter((p) => p.item_id === special.id)
          return (
            <div
              key={special.id}
              className="rounded-xl p-4 text-white"
              style={{ background: accentColor }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Plat du jour
              </p>
              <p className="text-lg font-bold">{special.name}</p>
              {special.description && (
                <p className="text-sm opacity-90">{special.description}</p>
              )}
              {itemPrices[0] && (
                <p className="mt-1 text-lg font-bold">
                  {formatPrice(itemPrices[0].amount_cents)}
                </p>
              )}
            </div>
          )
        })}

        {/* Categories as native details/summary */}
        {categories?.map((category, idx) => {
          const catItems = (items ?? []).filter((i) => i.category_id === category.id)
          if (catItems.length === 0) return null

          return (
            <details key={category.id} open={idx === 0} className="group rounded-xl border bg-white">
              <summary
                className="cursor-pointer list-none px-4 py-3 font-semibold text-lg flex items-center justify-between"
                style={{
                  fontFamily: `${brandKit?.font_heading || 'Inter'}, sans-serif`,
                }}
              >
                <span>{category.name}</span>
                <span className="text-sm text-muted-foreground">
                  {catItems.length} plat{catItems.length > 1 ? 's' : ''}
                </span>
              </summary>
              <div className="divide-y px-4 pb-2">
                {catItems.map((item) => {
                  const itemPrices = (prices ?? []).filter((p) => p.item_id === item.id)
                  const itemAllergens = (allergens ?? []).filter((a) => a.item_id === item.id)

                  return (
                    <div key={item.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          {itemAllergens.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {itemAllergens.map((a) => (
                                <span
                                  key={a.id}
                                  className="rounded-full px-2 py-0.5 text-xs"
                                  style={{
                                    background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                                    color: accentColor,
                                  }}
                                  title={ALLERGEN_LABELS[a.allergen as Allergen]}
                                >
                                  {ALLERGEN_LABELS[a.allergen as Allergen]}
                                  {!a.is_confirmed && ' ?'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          {itemPrices.map((p) => (
                            <div key={p.id} className="text-sm">
                              {itemPrices.length > 1 && (
                                <span className="text-muted-foreground mr-1">{p.label}</span>
                              )}
                              <span className="font-semibold">{formatPrice(p.amount_cents)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}

        {/* Footer */}
        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground space-y-2">
          <p>Les informations sur les allergènes sont fournies à titre indicatif. En cas de doute, demandez au personnel.</p>
          <p>Prix TTC</p>
          <p>Propulsé par <strong>Tavo</strong></p>
        </footer>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create the QR code display component**

Create `src/components/parametres/qr-code-display.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function QRCodeDisplay({ slug }: { slug: string }) {
  const [svgData, setSvgData] = useState('')
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}`

  useEffect(() => {
    QRCode.toString(menuUrl, {
      type: 'svg',
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setSvgData)
  }, [menuUrl])

  function handleDownloadSVG() {
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${slug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPNG() {
    const dataUrl = await QRCode.toDataURL(menuUrl, { width: 1024, margin: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${slug}.png`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code — Menu interactif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="mx-auto w-64 h-64 border rounded-lg p-4"
          dangerouslySetInnerHTML={{ __html: svgData }}
        />

        <div className="space-y-2">
          <Label>URL du menu</Label>
          <Input readOnly value={menuUrl} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadSVG}>
            Télécharger SVG
          </Button>
          <Button variant="outline" onClick={handleDownloadPNG}>
            Télécharger PNG
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Create the QR code dashboard page**

Create `src/app/(dashboard)/parametres/qr-code/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { QRCodeDisplay } from '@/components/parametres/qr-code-display'

export default async function QRCodePage() {
  const { venue } = await getSession()

  if (!venue?.public_slug) {
    return <p className="text-muted-foreground">Aucun établissement avec un lien public configuré.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">QR Code</h1>
      <QRCodeDisplay slug={venue.public_slug} />
    </div>
  )
}
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add interactive menu page and QR code generator"
```

---

### Task 8: Photo Studio — ImageProvider + Mock + UI

**Files:**
- Create: `src/lib/images/provider.ts`
- Create: `src/lib/images/mock-provider.ts`
- Create: `src/lib/images/stability-provider.ts`
- Create: `src/lib/images/index.ts`
- Create: `src/lib/actions/studio.ts`
- Create: `src/lib/queries/studio.ts`
- Create: `src/app/(dashboard)/studio/page.tsx`
- Create: `src/components/studio/photo-upload.tsx`
- Create: `src/components/studio/job-grid.tsx`
- Create: `src/components/studio/before-after.tsx`
- Create: `tests/unit/mock-provider.test.ts`

**Interfaces:**
- Consumes: `createServerClient()`, `getSession()`, types from Task 1
- Produces:
  - `ImageProvider` interface with `removeBackground`, `enhance`, `replaceScene` methods
  - `MockProvider` returning test images with 2s delay
  - `StabilityProvider` stub (calls Stability AI, but functional only with real API key)
  - `getImageProvider(): ImageProvider` — returns provider based on `IMAGE_PROVIDER` env var
  - Server actions: `uploadPhoto(formData)`, `processImage(assetId, type)`, `validateImage(jobId)`, `rejectImage(jobId)`
  - `getStudioJobs(orgId): Promise<ImageJob[]>`
  - `getCreditBalance(orgId): Promise<number>`
  - Working `/studio` page with upload, processing, before/after, and credit display

- [ ] **Step 1: Write test for mock provider**

Create `tests/unit/mock-provider.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MockProvider } from '@/lib/images/mock-provider'

describe('MockProvider', () => {
  const provider = new MockProvider()

  it('removeBackground returns a buffer after delay', async () => {
    const result = await provider.removeBackground(Buffer.from('test'))
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.mimeType).toBe('image/png')
    expect(result.width).toBeGreaterThan(0)
  }, 10000)

  it('enhance returns a buffer', async () => {
    const result = await provider.enhance(Buffer.from('test'))
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.mimeType).toBe('image/jpeg')
  }, 10000)

  it('replaceScene returns a buffer', async () => {
    const result = await provider.replaceScene(Buffer.from('test'), {
      surface: 'marble',
      lighting: 'warm',
      style: 'modern',
    })
    expect(result.buffer).toBeInstanceOf(Buffer)
  }, 10000)
})
```

- [ ] **Step 2: Create the ImageProvider interface**

Create `src/lib/images/provider.ts`:

```ts
export interface ProcessedImage {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

export interface SceneParams {
  surface: 'wood' | 'marble' | 'slate' | 'linen' | 'neutral'
  lighting: 'warm' | 'cool' | 'natural' | 'dramatic'
  style: 'rustic' | 'modern' | 'classic'
}

export interface ImageProvider {
  removeBackground(input: Buffer): Promise<ProcessedImage>
  enhance(input: Buffer): Promise<ProcessedImage>
  replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage>
}
```

- [ ] **Step 3: Create the MockProvider**

Create `src/lib/images/mock-provider.ts`:

```ts
import type { ImageProvider, ProcessedImage, SceneParams } from './provider'

function createMockImage(width: number, height: number, label: string): Buffer {
  // Create a simple SVG as a mock image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e0e0e0"/>
    <text x="50%" y="45%" text-anchor="middle" font-size="24" fill="#666">MOCK</text>
    <text x="50%" y="60%" text-anchor="middle" font-size="16" fill="#999">${label}</text>
  </svg>`
  return Buffer.from(svg)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockProvider implements ImageProvider {
  async removeBackground(input: Buffer): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, 'Background Removed'),
      mimeType: 'image/png',
      width: 800,
      height: 600,
    }
  }

  async enhance(input: Buffer): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, 'Enhanced'),
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    }
  }

  async replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, `Scene: ${params.surface}`),
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    }
  }
}
```

- [ ] **Step 4: Create the StabilityProvider stub**

Create `src/lib/images/stability-provider.ts`:

```ts
import type { ImageProvider, ProcessedImage, SceneParams } from './provider'

export class StabilityProvider implements ImageProvider {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY ?? ''
  }

  async removeBackground(input: Buffer): Promise<ProcessedImage> {
    const formData = new FormData()
    formData.append('image', new Blob([input]))
    formData.append('output_format', 'png')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/remove-background', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/png', width: 0, height: 0 }
  }

  async enhance(input: Buffer): Promise<ProcessedImage> {
    const formData = new FormData()
    formData.append('image', new Blob([input]))
    formData.append('prompt', 'enhance photo quality, better lighting, sharper, natural colors')
    formData.append('strength', '0.3')
    formData.append('output_format', 'jpeg')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/jpeg', width: 0, height: 0 }
  }

  async replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage> {
    const prompt = `food photography, ${params.surface} surface, ${params.lighting} lighting, ${params.style} style, professional food styling`

    const formData = new FormData()
    formData.append('image', new Blob([input]))
    formData.append('prompt', prompt)
    formData.append('output_format', 'jpeg')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/jpeg', width: 0, height: 0 }
  }
}
```

- [ ] **Step 5: Create the provider factory**

Create `src/lib/images/index.ts`:

```ts
import type { ImageProvider } from './provider'
import { MockProvider } from './mock-provider'
import { StabilityProvider } from './stability-provider'

export type { ImageProvider, ProcessedImage, SceneParams } from './provider'

let instance: ImageProvider | null = null

export function getImageProvider(): ImageProvider {
  if (!instance) {
    const providerType = process.env.IMAGE_PROVIDER || 'mock'
    instance = providerType === 'stability' ? new StabilityProvider() : new MockProvider()
  }
  return instance
}
```

- [ ] **Step 6: Run mock provider test**

```bash
pnpm test -- tests/unit/mock-provider.test.ts
```

Expected: 3 tests passed.

- [ ] **Step 7: Create studio queries**

Create `src/lib/queries/studio.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'

export async function getStudioJobs(organizationId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('image_jobs')
    .select('*, source_asset:assets!source_asset_id(*), result_asset:assets!result_asset_id(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function getCreditBalance(organizationId: string): Promise<number> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('credit_ledger')
    .select('balance_after')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data?.balance_after ?? 0
}
```

- [ ] **Step 8: Create studio server actions**

Create `src/lib/actions/studio.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getImageProvider } from '@/lib/images'
import { getSession } from '@/lib/auth/get-session'

export async function uploadPhoto(formData: FormData) {
  const { organization } = await getSession()
  const supabase = await createServerClient()
  const file = formData.get('photo') as File
  if (!file) throw new Error('No file')

  const ext = file.name.split('.').pop()
  const path = `photos/${organization.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(path, file)

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)

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

    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(resultPath)

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
    await supabase.from('image_jobs').update({
      status: 'completed',
      result_asset_id: resultAsset?.id,
    }).eq('id', job.id)

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
    await supabase.from('image_jobs').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }).eq('id', job.id)
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
```

- [ ] **Step 9: Create the studio page and components**

Create `src/components/studio/photo-upload.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { uploadPhoto, processImage } from '@/lib/actions/studio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera } from 'lucide-react'

export function PhotoUpload({ credits }: { credits: number }) {
  const [isPending, startTransition] = useTransition()

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('photo', file)

    startTransition(async () => {
      const asset = await uploadPhoto(formData)
      // Auto-start enhance
      await processImage(asset.id, 'enhance')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Studio photo</span>
          <span className="text-sm font-normal text-muted-foreground">
            {credits} crédit{credits !== 1 ? 's' : ''} restant{credits !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
          <Camera className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Lumière naturelle, vue du dessus ou 45°, fond uni si possible
          </p>
          <label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleUpload}
              disabled={isPending || credits <= 0}
            />
            <Button asChild disabled={isPending || credits <= 0}>
              <span>{isPending ? 'Traitement...' : 'Prendre ou importer une photo'}</span>
            </Button>
          </label>
          {credits <= 0 && (
            <p className="text-sm text-destructive">
              Votre quota mensuel est atteint.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

Create `src/components/studio/job-grid.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { processImage, validateImage, rejectImage } from '@/lib/actions/studio'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, RefreshCw, Scissors, Sparkles } from 'lucide-react'

interface Job {
  id: string
  type: string
  status: string
  source_asset: { original_url: string } | null
  result_asset: { original_url: string } | null
  created_at: string
}

export function JobGrid({ jobs }: { jobs: Job[] }) {
  const [isPending, startTransition] = useTransition()

  if (jobs.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune photo traitée pour le moment.
      </p>
    )
  }

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    processing: 'En cours...',
    completed: 'Terminé',
    failed: 'Échec',
    rejected: 'Rejeté',
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className={isPending ? 'opacity-50' : ''}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                {statusLabels[job.status] ?? job.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {job.type === 'enhance' ? 'Amélioration' : job.type === 'remove_bg' ? 'Détourage' : 'Mise en scène'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {job.source_asset && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avant</p>
                  <img src={job.source_asset.original_url} alt="Avant" className="rounded-lg border aspect-square object-cover" />
                </div>
              )}
              {job.result_asset && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Après</p>
                  <img src={job.result_asset.original_url} alt="Après" className="rounded-lg border aspect-square object-cover" />
                </div>
              )}
            </div>

            {job.status === 'completed' && job.source_asset && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startTransition(() => processImage(job.source_asset!.original_url, 'remove_bg'))}>
                  <Scissors className="mr-1 h-3 w-3" /> Détourer
                </Button>
                <Button size="sm" variant="outline" onClick={() => startTransition(() => processImage(job.source_asset!.original_url, 'scene'))}>
                  <Sparkles className="mr-1 h-3 w-3" /> Mise en scène
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Create `src/app/(dashboard)/studio/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getStudioJobs, getCreditBalance } from '@/lib/queries/studio'
import { PhotoUpload } from '@/components/studio/photo-upload'
import { JobGrid } from '@/components/studio/job-grid'

export default async function StudioPage() {
  const { organization } = await getSession()
  const [jobs, credits] = await Promise.all([
    getStudioJobs(organization.id),
    getCreditBalance(organization.id),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Studio photo</h1>
      <PhotoUpload credits={credits} />
      <JobGrid jobs={jobs} />
    </div>
  )
}
```

- [ ] **Step 10: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add photo studio with ImageProvider abstraction, mock, and UI"
```

---

### Task 9: TV Screen Management Dashboard

**Files:**
- Create: `src/app/(dashboard)/tv/page.tsx`
- Create: `src/components/tv/screen-list.tsx`
- Create: `src/components/tv/add-screen-dialog.tsx`
- Create: `src/lib/actions/screen.ts`
- Create: `src/lib/queries/screen.ts`

**Interfaces:**
- Consumes: `createServerClient()`, `getSession()`, types from Task 1, `TemplateRenderer` from Task 5
- Produces:
  - `/tv` dashboard page showing screens, their status (online/offline), and a preview
  - `createScreen(venueId, name, orientation): Promise<{ screen, token }>` — creates screen + token
  - `deleteScreen(screenId): Promise<void>`
  - `getScreens(venueId): Promise<Screen[]>`

- [ ] **Step 1: Create screen queries**

Create `src/lib/queries/screen.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'

export async function getScreens(venueId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('screens')
    .select('*, scenes(*, template:templates(*), schedules(*))')
    .eq('venue_id', venueId)
    .order('created_at')
  return data ?? []
}
```

- [ ] **Step 2: Create screen actions**

Create `src/lib/actions/screen.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function createScreen(venueId: string, name: string, orientation: 'landscape' | 'portrait') {
  const supabase = await createServerClient()
  const token = crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const { data: screen, error } = await supabase
    .from('screens')
    .insert({ venue_id: venueId, name, orientation, token_hash: tokenHash })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Create a default scene with the first available template
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (template && screen) {
    const { data: scene } = await supabase
      .from('scenes')
      .insert({ screen_id: screen.id, template_id: template.id, data: {} })
      .select()
      .single()

    if (scene) {
      await supabase.from('schedules').insert({
        scene_id: scene.id,
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        start_time: '00:00',
        end_time: '23:59',
        label: 'Toute la journée',
      })
    }
  }

  revalidatePath('/tv')
  return { screen, token }
}

export async function deleteScreen(screenId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('screens').delete().eq('id', screenId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}
```

- [ ] **Step 3: Create the add screen dialog**

Create `src/components/tv/add-screen-dialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createScreen } from '@/lib/actions/screen'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Copy } from 'lucide-react'

export function AddScreenDialog({ venueId }: { venueId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('Écran principal')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [tokenResult, setTokenResult] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createScreen(venueId, name, orientation)
      const url = `${window.location.origin}/tv/${result.token}`
      setTokenResult(url)
    })
  }

  function handleCopy() {
    if (tokenResult) {
      navigator.clipboard.writeText(tokenResult)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTokenResult(null) }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un écran
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel écran</DialogTitle>
        </DialogHeader>

        {tokenResult ? (
          <div className="space-y-4">
            <p className="text-sm">Ouvrez ce lien sur votre TV :</p>
            <div className="flex gap-2">
              <Input readOnly value={tokenResult} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => { setOpen(false); setTokenResult(null) }}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <div className="flex gap-2">
                <Button type="button" variant={orientation === 'landscape' ? 'default' : 'outline'} onClick={() => setOrientation('landscape')}>
                  Paysage (16:9)
                </Button>
                <Button type="button" variant={orientation === 'portrait' ? 'default' : 'outline'} onClick={() => setOrientation('portrait')}>
                  Portrait (9:16)
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création...' : 'Créer'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Create the screen list and TV page**

Create `src/components/tv/screen-list.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { deleteScreen } from '@/lib/actions/screen'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Monitor } from 'lucide-react'

interface ScreenData {
  id: string
  name: string
  orientation: string
  last_seen_at: string | null
}

export function ScreenList({ screens }: { screens: ScreenData[] }) {
  const [isPending, startTransition] = useTransition()

  function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    const diff = Date.now() - new Date(lastSeen).getTime()
    return diff < 120000 // 2 minutes
  }

  if (screens.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Aucun écran configuré. Ajoutez-en un pour commencer.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {screens.map((screen) => (
        <Card key={screen.id} className={isPending ? 'opacity-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {screen.name}
            </CardTitle>
            <Badge variant={isOnline(screen.last_seen_at) ? 'default' : 'secondary'}>
              {isOnline(screen.last_seen_at) ? 'En ligne' : screen.last_seen_at ? 'Hors ligne' : 'Jamais connecté'}
            </Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {screen.orientation === 'landscape' ? 'Paysage 16:9' : 'Portrait 9:16'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => {
                if (confirm('Supprimer cet écran ?')) {
                  startTransition(() => deleteScreen(screen.id))
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Create `src/app/(dashboard)/tv/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getScreens } from '@/lib/queries/screen'
import { ScreenList } from '@/components/tv/screen-list'
import { AddScreenDialog } from '@/components/tv/add-screen-dialog'

export default async function TVPage() {
  const { venue } = await getSession()

  if (!venue) {
    return <p className="text-muted-foreground">Aucun établissement configuré.</p>
  }

  const screens = await getScreens(venue.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affichage TV</h1>
        <AddScreenDialog venueId={venue.id} />
      </div>
      <ScreenList screens={screens} />
    </div>
  )
}
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add TV screen management dashboard with create and delete"
```

---

### Task 10: Final Verification + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-9
- Produces: updated CLAUDE.md, verified passing quality checks

- [ ] **Step 1: Run all quality checks**

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Update CLAUDE.md with Phase 1 additions**

Add to the directory structure section:
- `src/lib/types/` — Shared types (menu, brand, template)
- `src/lib/actions/` — Server actions (menu, brand, screen, studio)
- `src/lib/queries/` — Data queries (menu, brand, screen, studio)
- `src/lib/templates/` — Template registry and data mapper
- `src/lib/images/` — ImageProvider abstraction
- `templates/` — Template definitions

Add to the commands or conventions section:
- `IMAGE_PROVIDER=mock` for local dev (no Stability API key needed)
- Templates are self-contained in `templates/` with manifest.json, schema.ts, Template.tsx
- The TV player at `/tv/[token]` uses Supabase Realtime for live updates
- The interactive menu at `/m/[slug]` uses ISR with 60-second revalidation

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: update CLAUDE.md for Phase 1"
```

- [ ] **Step 4: Tag the phase**

```bash
git tag phase-1-complete
```
