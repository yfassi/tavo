'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { exportOrganizationData, requestAccountDeletion } from '@/lib/actions/gdpr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Trash2 } from 'lucide-react'

export default function DonneesPage() {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportOrganizationData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tavo-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    const confirmed = confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible. ' +
        'Vos données seront supprimées dans un délai de 30 jours.',
    )
    if (!confirmed) return

    const doubleConfirm = confirm(
      'Dernière confirmation : toutes vos données (carte, photos, écrans) seront définitivement supprimées.',
    )
    if (!doubleConfirm) return

    setDeleting(true)
    try {
      await requestAccountDeletion()
      router.push('/login?message=account_deleted')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mes données</h1>

      <Card>
        <CardHeader>
          <CardTitle>Exporter mes données</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Téléchargez une copie de toutes vos données au format JSON : carte, établissements,
            abonnement, historique des traitements.
          </p>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Export en cours...' : 'Télécharger mes données'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Supprimer mon compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La suppression de votre compte entraîne l&apos;annulation de votre abonnement et la
            suppression de toutes vos données dans un délai de 30 jours. Cette action est
            irréversible.
          </p>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? 'Suppression...' : 'Supprimer mon compte'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
