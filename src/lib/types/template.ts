import { z } from 'zod'

export interface TemplateManifest {
  slug: string
  name: string
  family: 'street' | 'bistrot'
  formats: ('landscape' | 'portrait')[]
  loopDurationMs: number
  maxItemsPerScreen: number
  colorVariants: {
    name: string
    tokens: Record<string, string>
  }[]
  version: number
}

export const templateSlotSchema = z.object({
  venueName: z.string(),
  logo: z.string().url().optional(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  categories: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          prices: z.array(
            z.object({
              label: z.string(),
              amountCents: z.number(),
            }),
          ),
          photoUrl: z.string().url().optional(),
          allergens: z.array(z.string()).optional(),
          isDailySpecial: z.boolean().optional(),
          isAvailable: z.boolean().default(true),
        }),
      ),
    }),
  ),
})

export type TemplateSlotData = z.infer<typeof templateSlotSchema>

export interface TemplateProps {
  data: TemplateSlotData
  format: 'landscape' | 'portrait'
}
