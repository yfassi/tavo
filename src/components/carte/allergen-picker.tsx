'use client'

import { ALLERGENS, ALLERGEN_LABELS, type Allergen, type MenuItemAllergen } from '@/lib/types/menu'
import { toggleAllergen, confirmAllergen } from '@/lib/actions/menu'
import { Badge } from '@/components/ui/badge'
import { useTransition } from 'react'

export function AllergenPicker({
  itemId,
  allergens,
}: {
  itemId: string
  allergens: MenuItemAllergen[]
}) {
  const [isPending, startTransition] = useTransition()

  const activeAllergens = new Set(allergens.map((a) => a.allergen))

  function handleToggle(allergen: Allergen) {
    startTransition(() => {
      toggleAllergen(itemId, allergen, true)
    })
  }

  function handleConfirm(id: string, isConfirmed: boolean) {
    startTransition(() => {
      confirmAllergen(id, isConfirmed)
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sélection des allergènes">
      {ALLERGENS.map((allergen) => {
        const existing = allergens.find((a) => a.allergen === allergen)
        const isActive = activeAllergens.has(allergen)

        return (
          <Badge
            key={allergen}
            role="button"
            aria-pressed={isActive}
            aria-label={`${ALLERGEN_LABELS[allergen]}${isActive && !existing?.is_confirmed ? ' — à vérifier' : ''}`}
            variant={isActive ? (existing?.is_confirmed ? 'default' : 'secondary') : 'outline'}
            className={`cursor-pointer text-xs ${isPending ? 'opacity-50' : ''} ${
              isActive && !existing?.is_confirmed ? 'border-yellow-500' : ''
            }`}
            onClick={() => {
              if (isActive && existing && !existing.is_confirmed) {
                handleConfirm(existing.id, true)
              } else {
                handleToggle(allergen)
              }
            }}
          >
            {ALLERGEN_LABELS[allergen]}
            {isActive && !existing?.is_confirmed && ' ?'}
          </Badge>
        )
      })}
    </div>
  )
}
