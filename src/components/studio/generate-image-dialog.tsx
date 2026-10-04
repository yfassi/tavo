'use client'

import { useState, useTransition } from 'react'
import { generateImage } from '@/lib/actions/generate-image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

export function GenerateImageDialog({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [prompt, setPrompt] = useState('')

  function handleGenerate() {
    if (!prompt.trim()) return
    startTransition(async () => {
      await generateImage(prompt.trim())
      setPrompt('')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" disabled={credits <= 0} />}>
        <Sparkles className="mr-2 h-4 w-4" /> Générer une image
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer une image de plat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Badge variant="secondary" className="text-xs">
            Illustration IA, non contractuelle
          </Badge>
          <p className="text-sm text-muted-foreground">
            Décrivez le plat que vous souhaitez illustrer. L&apos;image générée portera la mention
            &quot;Illustration IA&quot;.
          </p>
          <div className="space-y-2">
            <Label>Description du plat</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un bol de ramen fumant avec des œufs mollets, du porc chashu et des oignons verts"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            className="w-full"
          >
            {isPending ? 'Génération en cours...' : 'Générer (1 crédit)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
