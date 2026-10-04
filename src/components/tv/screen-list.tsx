'use client'

import { useTransition } from 'react'
import { deleteScreen } from '@/lib/actions/screen'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Monitor } from 'lucide-react'

interface ScreenData {
  id: string
  name: string
  orientation: string
  last_seen_at: string | null
}

function getStatus(lastSeen: string | null, now: number): 'online' | 'offline' | 'never' {
  if (!lastSeen) return 'never'
  return now - new Date(lastSeen).getTime() < 120000 ? 'online' : 'offline'
}

export function ScreenList({ screens, now }: { screens: ScreenData[]; now: number }) {
  const [isPending, startTransition] = useTransition()

  if (screens.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Aucun écran configuré. Ajoutez-en un pour commencer.
      </p>
    )
  }

  const statuses = screens.map((s) => getStatus(s.last_seen_at, now))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {screens.map((screen, i) => (
        <Card key={screen.id} className={isPending ? 'opacity-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {screen.name}
            </CardTitle>
            <Badge variant={statuses[i] === 'online' ? 'default' : 'secondary'}>
              {statuses[i] === 'online'
                ? 'En ligne'
                : statuses[i] === 'offline'
                  ? 'Hors ligne'
                  : 'Jamais connecté'}
            </Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {screen.orientation === 'landscape' ? 'Paysage 16:9' : 'Portrait 9:16'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => {
                if (confirm('Supprimer cet écran ?')) {
                  startTransition(() => deleteScreen(screen.id))
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
