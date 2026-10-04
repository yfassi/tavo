'use client'

import { useTransition } from 'react'
import { processImage } from '@/lib/actions/studio'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Scissors, Sparkles } from 'lucide-react'

interface Asset {
  original_url: string
}

interface Job {
  id: string
  type: string
  status: string
  source_asset: Asset | null
  result_asset: Asset | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours...',
  completed: 'Terminé',
  failed: 'Échec',
  rejected: 'Rejeté',
}

const typeLabels: Record<string, string> = {
  enhance: 'Amélioration',
  remove_bg: 'Détourage',
  scene: 'Mise en scène',
}

export function JobGrid({ jobs }: { jobs: Job[] }) {
  const [isPending, startTransition] = useTransition()

  if (jobs.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">Aucune photo traitée pour le moment.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className={isPending ? 'opacity-50' : ''}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  job.status === 'completed'
                    ? 'default'
                    : job.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {statusLabels[job.status] ?? job.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {typeLabels[job.type] ?? job.type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {job.source_asset && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avant</p>
                  <img
                    src={job.source_asset.original_url}
                    alt="Avant"
                    className="rounded-lg border aspect-square object-cover"
                  />
                </div>
              )}
              {job.result_asset && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Après</p>
                  <img
                    src={job.result_asset.original_url}
                    alt="Après"
                    className="rounded-lg border aspect-square object-cover"
                  />
                </div>
              )}
            </div>

            {job.status === 'completed' && job.source_asset && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => startTransition(() => processImage(job.id, 'remove_bg'))}
                >
                  <Scissors className="mr-1 h-3 w-3" /> Détourer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => startTransition(() => processImage(job.id, 'scene'))}
                >
                  <Sparkles className="mr-1 h-3 w-3" /> Mise en scène
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
