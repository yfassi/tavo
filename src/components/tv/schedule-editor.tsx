'use client'

import { useState, useTransition } from 'react'
import { createSchedule, updateSchedule, deleteSchedule, DAY_LABELS } from '@/lib/actions/schedule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Clock } from 'lucide-react'

interface Schedule {
  id: string
  label: string | null
  days_of_week: number[]
  start_time: string
  end_time: string
  is_active: boolean
}

interface ScheduleEditorProps {
  sceneId: string
  schedules: Schedule[]
}

const PRESETS = [
  { label: 'Déjeuner', startTime: '11:30', endTime: '14:30', days: [1, 2, 3, 4, 5] },
  { label: 'Soir', startTime: '18:00', endTime: '23:00', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Happy Hour', startTime: '17:00', endTime: '19:00', days: [1, 2, 3, 4, 5] },
  { label: 'Week-end', startTime: '10:00', endTime: '23:00', days: [6, 7] },
]

export function ScheduleEditor({ sceneId, schedules }: ScheduleEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newStart, setNewStart] = useState('11:30')
  const [newEnd, setNewEnd] = useState('14:30')
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])

  function handleAddPreset(preset: (typeof PRESETS)[0]) {
    startTransition(async () => {
      await createSchedule(sceneId, {
        label: preset.label,
        daysOfWeek: preset.days,
        startTime: preset.startTime,
        endTime: preset.endTime,
      })
    })
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    startTransition(async () => {
      await createSchedule(sceneId, {
        label: newLabel.trim(),
        daysOfWeek: newDays,
        startTime: newStart,
        endTime: newEnd,
      })
      setShowAdd(false)
      setNewLabel('')
    })
  }

  function handleToggle(scheduleId: string, isActive: boolean) {
    startTransition(() => updateSchedule(scheduleId, { isActive }))
  }

  function handleDelete(scheduleId: string) {
    if (confirm('Supprimer cette plage horaire ?')) {
      startTransition(() => deleteSchedule(scheduleId))
    }
  }

  function toggleDay(day: number) {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  return (
    <Card className={isPending ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Plages horaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.length === 0 && !showAdd && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ajoutez des plages horaires ou utilisez un preset :
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {schedules.map((sch) => (
          <div key={sch.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={sch.is_active} onCheckedChange={(v) => handleToggle(sch.id, v)} />
            <div className="flex-1">
              <p className="text-sm font-medium">{sch.label ?? 'Sans nom'}</p>
              <p className="text-xs text-muted-foreground">
                {sch.start_time.slice(0, 5)} — {sch.end_time.slice(0, 5)} &middot;{' '}
                {sch.days_of_week.map((d) => DAY_LABELS[d]?.slice(0, 3)).join(', ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => handleDelete(sch.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {showAdd ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Déjeuner, Soir, Happy Hour..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Début</Label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <Badge
                  key={day}
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDay(day)}
                >
                  {DAY_LABELS[day]?.slice(0, 3)}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                Ajouter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          schedules.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une plage
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
