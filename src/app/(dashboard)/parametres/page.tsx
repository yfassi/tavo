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
