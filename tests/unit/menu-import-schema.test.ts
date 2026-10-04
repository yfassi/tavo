import { describe, it, expect } from 'vitest'
import { MenuImportSchema } from '@/lib/ai/schemas'

describe('MenuImportSchema', () => {
  it('validates a correct import result', () => {
    const data = {
      categories: [
        {
          name: 'Entrées',
          items: [
            {
              name: "Soupe à l'oignon",
              description: 'Gratinée au fromage',
              prices: [{ label: 'Seul', amountCents: 750 }],
              suggestedAllergens: ['gluten', 'lait'],
              uncertain: false,
            },
          ],
        },
      ],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('allows uncertain items', () => {
    const data = {
      categories: [
        {
          name: 'Plats',
          items: [
            {
              name: 'Plat du jour',
              prices: [{ label: 'Seul', amountCents: 0, uncertain: true }],
              suggestedAllergens: [],
              uncertain: true,
            },
          ],
        },
      ],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categories[0].items[0].uncertain).toBe(true)
    }
  })

  it('rejects missing category name', () => {
    const data = {
      categories: [{ items: [] }],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
