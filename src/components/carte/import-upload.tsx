'use client'

import { useState, useTransition } from 'react'
import { uploadMenuImage, runMenuImport } from '@/lib/actions/import'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2 } from 'lucide-react'
import type { MenuImportResult } from '@/lib/ai/schemas'

interface ImportUploadProps {
  onResult: (result: MenuImportResult) => void
}

export function ImportUpload({ onResult }: ImportUploadProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const formData = new FormData()
    formData.append('menu_image', file)

    startTransition(async () => {
      try {
        setStatus('uploading')
        const { imageUrl } = await uploadMenuImage(formData)

        setStatus('analyzing')
        const { result } = await runMenuImport(imageUrl)

        onResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'import")
      } finally {
        setStatus('idle')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer une carte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Prenez en photo votre carte ou importez un PDF. L&apos;IA analysera le contenu et extraira
          les plats, prix et catégories.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isPending ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {status === 'uploading' ? "Envoi de l'image..." : "Analyse en cours par l'IA..."}
            </p>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">Photo ou PDF de votre carte</span>
            <Input
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline">
              Choisir un fichier
            </Button>
          </label>
        )}
      </CardContent>
    </Card>
  )
}
