'use client'

import { useState, useTransition } from 'react'
import { createScreen } from '@/lib/actions/screen'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Copy } from 'lucide-react'

export function AddScreenDialog({ venueId }: { venueId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('Écran principal')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [tokenResult, setTokenResult] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createScreen(venueId, name, orientation)
      const url = `${window.location.origin}/tv/${result.token}`
      setTokenResult(url)
    })
  }

  function handleCopy() {
    if (tokenResult) {
      navigator.clipboard.writeText(tokenResult)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setTokenResult(null)
      }}
    >
      <DialogTrigger>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un écran
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel écran</DialogTitle>
        </DialogHeader>

        {tokenResult ? (
          <div className="space-y-4">
            <p className="text-sm">Ouvrez ce lien sur votre TV :</p>
            <div className="flex gap-2">
              <Input readOnly value={tokenResult} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setOpen(false)
                setTokenResult(null)
              }}
            >
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={orientation === 'landscape' ? 'default' : 'outline'}
                  onClick={() => setOrientation('landscape')}
                >
                  Paysage (16:9)
                </Button>
                <Button
                  type="button"
                  variant={orientation === 'portrait' ? 'default' : 'outline'}
                  onClick={() => setOrientation('portrait')}
                >
                  Portrait (9:16)
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création...' : 'Créer'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
