import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems } from '@/lib/queries/menu'
import { ImportPageClient } from '@/components/carte/import-page-client'

export default async function ImportPage() {
  const { venue } = await getSession()

  if (!venue) {
    return <p className="text-muted-foreground">Aucun établissement configuré.</p>
  }

  const menu = await getMenuWithItems(venue.id)

  if (!menu) {
    return <p className="text-muted-foreground">Aucune carte active.</p>
  }

  return <ImportPageClient menuId={menu.id} />
}
