'use client'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ALLERGEN_LABELS, type Allergen } from '@/lib/types/menu'
import { formatPriceRaw } from '@/lib/format'

interface ImportItemData {
  name: string
  description?: string
  prices: { label: string; amountCents: number; uncertain?: boolean }[]
  suggestedAllergens: string[]
  uncertain?: boolean
}

interface ImportItemRowProps {
  item: ImportItemData
  onChange: (updated: ImportItemData) => void
  onDelete: () => void
}

export function ImportItemRow({ item, onChange, onDelete }: ImportItemRowProps) {
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${item.uncertain ? 'border-yellow-500 bg-yellow-50' : ''}`}
    >
      {item.uncertain && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
          À vérifier
        </Badge>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Input
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            placeholder="Nom du plat"
            className={item.uncertain ? 'border-yellow-500' : ''}
          />
          <Input
            value={item.description ?? ''}
            onChange={(e) => onChange({ ...item, description: e.target.value || undefined })}
            placeholder="Description (optionnel)"
          />
        </div>

        <div className="space-y-1">
          {item.prices.map((price, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                className={`w-20 ${price.uncertain ? 'border-yellow-500 bg-yellow-50' : ''}`}
                value={price.amountCents > 0 ? formatPriceRaw(price.amountCents) : ''}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100)
                  const newPrices = [...item.prices]
                  newPrices[i] = {
                    ...price,
                    amountCents: isNaN(cents) ? 0 : cents,
                    uncertain: false,
                  }
                  onChange({ ...item, prices: newPrices })
                }}
                placeholder="Prix"
              />
              <span className="text-xs text-muted-foreground">€</span>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {item.suggestedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.suggestedAllergens.map((allergen) => (
            <Badge key={allergen} variant="secondary" className="text-xs border-yellow-500">
              {ALLERGEN_LABELS[allergen as Allergen] ?? allergen} ?
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
