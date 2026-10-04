import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TemplateRenderer } from '@/components/templates/template-renderer'
import type { TemplateSlotData, TemplateManifest } from '@/lib/types/template'

interface TemplatePreviewCardProps {
  manifest: TemplateManifest
  slotData: TemplateSlotData
}

export function TemplatePreviewCard({ manifest, slotData }: TemplatePreviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{manifest.name}</CardTitle>
          <Badge variant="secondary">{manifest.family}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border" style={{ aspectRatio: '16/9' }}>
          <TemplateRenderer slug={manifest.slug} data={slotData} format="landscape" />
        </div>
        <div className="mt-2 flex gap-2">
          {manifest.colorVariants.map((v) => (
            <div key={v.name} className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded-full border" style={{ background: v.tokens.bg }} />
              {v.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
