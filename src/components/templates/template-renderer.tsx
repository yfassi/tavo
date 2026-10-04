import { getTemplate } from '@/lib/templates/registry'
import type { TemplateSlotData } from '@/lib/types/template'

interface TemplateRendererProps {
  slug: string
  data: TemplateSlotData
  format: 'landscape' | 'portrait'
}

export function TemplateRenderer({ slug, data, format }: TemplateRendererProps) {
  const template = getTemplate(slug)

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Template &quot;{slug}&quot; introuvable
      </div>
    )
  }

  const { Component } = template
  const aspectRatio = format === 'landscape' ? '16/9' : '9/16'

  return (
    <div style={{ aspectRatio, width: '100%', position: 'relative' }}>
      <Component data={data} format={format} />
    </div>
  )
}
