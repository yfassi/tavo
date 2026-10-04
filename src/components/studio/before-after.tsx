'use client'

interface BeforeAfterProps {
  beforeUrl: string
  afterUrl: string
  label?: string
}

export function BeforeAfter({ beforeUrl, afterUrl, label }: BeforeAfterProps) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Avant</p>
          <img
            src={beforeUrl}
            alt="Avant"
            className="rounded-lg border aspect-square object-cover w-full"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Après</p>
          <img
            src={afterUrl}
            alt="Après"
            className="rounded-lg border aspect-square object-cover w-full"
          />
        </div>
      </div>
    </div>
  )
}
