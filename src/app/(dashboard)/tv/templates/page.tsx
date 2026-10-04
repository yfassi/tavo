import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems } from '@/lib/queries/menu'
import { getBrandKit } from '@/lib/queries/brand'
import { getAllTemplates } from '@/lib/templates/registry'
import { mapMenuToSlotData } from '@/lib/templates/data-mapper'
import { TemplatePreviewCard } from '@/components/tv/template-preview-card'
import type { TemplateSlotData } from '@/lib/types/template'

export default async function TemplateLibraryPage() {
  const { venue } = await getSession()
  const templates = getAllTemplates()

  let slotData: TemplateSlotData | null = null

  if (venue) {
    const [menu, brandKit] = await Promise.all([getMenuWithItems(venue.id), getBrandKit(venue.id)])

    if (menu && brandKit) {
      slotData = mapMenuToSlotData(menu, venue, brandKit)
    }
  }

  // Fallback data if no menu exists
  const previewData: TemplateSlotData = slotData ?? {
    venueName: 'Mon Restaurant',
    accentColor: '#c2185b',
    categories: [
      {
        name: 'Entrées',
        items: [
          {
            name: 'Soupe du jour',
            prices: [{ label: 'Seul', amountCents: 750 }],
            isAvailable: true,
          },
          {
            name: 'Salade verte',
            prices: [{ label: 'Seul', amountCents: 650 }],
            isAvailable: true,
          },
        ],
      },
      {
        name: 'Plats',
        items: [
          {
            name: 'Steak-frites',
            prices: [{ label: 'Seul', amountCents: 1690 }],
            isDailySpecial: true,
            isAvailable: true,
          },
          {
            name: 'Poulet rôti',
            prices: [{ label: 'Seul', amountCents: 1490 }],
            isAvailable: true,
          },
        ],
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bibliothèque de templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aperçu avec {slotData ? 'votre carte' : 'des données de démonstration'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplatePreviewCard key={t.manifest.slug} manifest={t.manifest} slotData={previewData} />
        ))}
      </div>
    </div>
  )
}
