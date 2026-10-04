import { z } from 'zod'

export const MenuImportSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          prices: z.array(
            z.object({
              label: z.string().default('Seul'),
              amountCents: z.number().int().min(0),
              uncertain: z.boolean().optional(),
            }),
          ),
          suggestedAllergens: z.array(z.string()),
          uncertain: z.boolean().optional(),
        }),
      ),
    }),
  ),
})

export type MenuImportResult = z.infer<typeof MenuImportSchema>

export const TextGenerationSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
})

export type TextGenerationResult = z.infer<typeof TextGenerationSchema>
