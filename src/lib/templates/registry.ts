import type { TemplateManifest, TemplateProps } from '@/lib/types/template'
import type { ComponentType } from 'react'

import streetManifest from '../../../templates/street-01/manifest.json'
import bistrotManifest from '../../../templates/bistrot-01/manifest.json'
import { StreetBoldTemplate } from '../../../templates/street-01/Template'
import { BistrotArdoiseTemplate } from '../../../templates/bistrot-01/Template'

export interface TemplateModule {
  manifest: TemplateManifest
  Component: ComponentType<TemplateProps>
}

const registry: Record<string, TemplateModule> = {
  'street-01': { manifest: streetManifest as TemplateManifest, Component: StreetBoldTemplate },
  'bistrot-01': {
    manifest: bistrotManifest as TemplateManifest,
    Component: BistrotArdoiseTemplate,
  },
}

export function getTemplate(slug: string): TemplateModule | undefined {
  return registry[slug]
}

export function getAllTemplates(): TemplateModule[] {
  return Object.values(registry)
}
