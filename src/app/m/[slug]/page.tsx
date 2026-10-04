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

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
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
            // eslint-disable-next-line @next/next/no-img-element
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
        {items
          ?.filter((i) => i.is_daily_special)
          .map((special) => {
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
                {special.description && <p className="text-sm opacity-90">{special.description}</p>}
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
            <details
              key={category.id}
              open={idx === 0}
              className="group rounded-xl border bg-white"
            >
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
          <p>
            Les informations sur les allergènes sont fournies à titre indicatif. En cas de doute,
            demandez au personnel.
          </p>
          <p>Prix TTC</p>
          <p>
            Propulsé par <strong>Tavo</strong>
          </p>
          <p>
            <a
              href="/legal/confidentialite"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Politique de confidentialité
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
