import type { TemplateManifest, TemplateProps } from '@/lib/types/template'
import type { ComponentType } from 'react'

import streetManifest from '../../../templates/street-01/manifest.json'
import bistrotManifest from '../../../templates/bistrot-01/manifest.json'
import streetNeonManifest from '../../../templates/street-02/manifest.json'
import streetMinimalManifest from '../../../templates/street-03/manifest.json'
import bistrotElegantManifest from '../../../templates/bistrot-02/manifest.json'
import bistrotMarketManifest from '../../../templates/bistrot-03/manifest.json'
import { StreetBoldTemplate } from '../../../templates/street-01/Template'
import { BistrotArdoiseTemplate } from '../../../templates/bistrot-01/Template'
import { StreetNeonTemplate } from '../../../templates/street-02/Template'
import { StreetMinimalTemplate } from '../../../templates/street-03/Template'
import { BistrotElegantTemplate } from '../../../templates/bistrot-02/Template'
import { BistrotMarketTemplate } from '../../../templates/bistrot-03/Template'

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
  'street-02': { manifest: streetNeonManifest as TemplateManifest, Component: StreetNeonTemplate },
  'street-03': {
    manifest: streetMinimalManifest as TemplateManifest,
    Component: StreetMinimalTemplate,
  },
  'bistrot-02': {
    manifest: bistrotElegantManifest as TemplateManifest,
    Component: BistrotElegantTemplate,
  },
  'bistrot-03': {
    manifest: bistrotMarketManifest as TemplateManifest,
    Component: BistrotMarketTemplate,
  },
}

export function getTemplate(slug: string): TemplateModule | undefined {
  return registry[slug]
}

export function getAllTemplates(): TemplateModule[] {
  return Object.values(registry)
}
