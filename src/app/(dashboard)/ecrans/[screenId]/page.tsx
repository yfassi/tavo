import { getSession } from '@/lib/auth/get-session'
import { getScreenWithSchedules } from '@/lib/queries/schedule'
import { ScheduleEditor } from '@/components/tv/schedule-editor'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Monitor } from 'lucide-react'

export default async function ScreenDetailPage({
  params,
}: {
  params: Promise<{ screenId: string }>
}) {
  const { screenId } = await params
  await getSession() // Ensure authenticated

  const screen = await getScreenWithSchedules(screenId)
  if (!screen) notFound()

  const scene = screen.scenes?.[0] // Use first scene for now

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tv">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5" /> {screen.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {screen.orientation === 'landscape' ? 'Paysage 16:9' : 'Portrait 9:16'}
          </p>
        </div>
        <Badge variant={screen.last_seen_at ? 'default' : 'secondary'} className="ml-auto">
          {screen.last_seen_at ? 'En ligne' : 'Jamais connecté'}
        </Badge>
      </div>

      {scene && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-2">Template actuel</p>
            <Badge>{scene.template?.name ?? scene.template?.slug ?? 'Inconnu'}</Badge>
          </div>

          <ScheduleEditor sceneId={scene.id} schedules={scene.schedules ?? []} />
        </div>
      )}

      {!scene && <p className="text-muted-foreground">Aucune scène configurée pour cet écran.</p>}
    </div>
  )
}
