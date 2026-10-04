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
            <Button disabled={isPending || credits <= 0}>
              <span>{isPending ? 'Traitement...' : 'Prendre ou importer une photo'}</span>
            </Button>
          </label>
          {credits <= 0 && (
            <p className="text-sm text-destructive">Votre quota mensuel est atteint.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
