import { getSession } from '@/lib/auth/get-session'
import { getScreensWithNow } from '@/lib/queries/screen'
import { ScreenList } from '@/components/tv/screen-list'
import { AddScreenDialog } from '@/components/tv/add-screen-dialog'

export default async function TVPage() {
  const { venue } = await getSession()

  if (!venue) {
    return <p className="text-muted-foreground">Aucun établissement configuré.</p>
  }

  const { screens, now } = await getScreensWithNow(venue.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affichage TV</h1>
        <AddScreenDialog venueId={venue.id} />
      </div>
      <ScreenList screens={screens} now={now} />
    </div>
  )
}
