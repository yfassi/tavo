import { getSession } from '@/lib/auth/get-session'
import { QRCodeDisplay } from '@/components/parametres/qr-code-display'

export default async function QRCodePage() {
  const { venue } = await getSession()

  if (!venue?.public_slug) {
    return (
      <p className="text-muted-foreground">Aucun établissement avec un lien public configuré.</p>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">QR Code</h1>
      <QRCodeDisplay slug={venue.public_slug} />
    </div>
  )
}
