'use client'

import { useState, useTransition } from 'react'
import { updateItem, deleteItem } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Star } from 'lucide-react'
import { PriceEditor } from './price-editor'
import { AllergenPicker } from './allergen-picker'
import { formatPrice } from '@/lib/format'
import type { MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

interface ItemRowProps {
  item: MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] }
}

export function ItemRow({ item }: ItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleNameBlur(value: string) {
    if (value !== item.name) {
      startTransition(() => updateItem(item.id, { name: value }))
    }
  }

  function handleDescriptionBlur(value: string) {
    const desc = value || null
    if (desc !== item.description) {
      startTransition(() => updateItem(item.id, { description: desc }))
    }
  }

  function handleToggleAvailability() {
    startTransition(() => updateItem(item.id, { is_available: !item.is_available }))
  }

  function handleToggleDailySpecial() {
    startTransition(() => updateItem(item.id, { is_daily_special: !item.is_daily_special }))
  }

  function handleDelete() {
    if (confirm('Supprimer ce plat ?')) {
      startTransition(() => deleteItem(item.id))
    }
  }

  const mainPrice = item.prices[0]

  return (
    <div
      className={`rounded-lg border p-3 ${!item.is_available ? 'opacity-50' : ''} ${isPending ? 'opacity-50' : ''}`}
    >
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.is_daily_special && (
              <Badge variant="secondary" className="text-xs">
                <Star className="mr-1 h-3 w-3" /> Plat du jour
              </Badge>
            )}
          </div>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <div className="text-right">
          {mainPrice && <span className="font-medium">{formatPrice(mainPrice.amount_cents)}</span>}
          {item.prices.length > 1 && (
            <span className="ml-1 text-xs text-muted-foreground">+{item.prices.length - 1}</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid gap-3">
            <Input
              defaultValue={item.name}
              onBlur={(e) => handleNameBlur(e.target.value)}
              placeholder="Nom du plat"
            />
            <Input
              defaultValue={item.description ?? ''}
              onBlur={(e) => handleDescriptionBlur(e.target.value)}
              placeholder="Description (optionnel)"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Prix</p>
            <PriceEditor itemId={item.id} prices={item.prices} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Allergènes</p>
            <AllergenPicker itemId={item.id} allergens={item.allergens} />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={item.is_available} onCheckedChange={handleToggleAvailability} />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={item.is_daily_special} onCheckedChange={handleToggleDailySpecial} />
              Plat du jour
            </label>
          </div>

          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
          </Button>
        </div>
      )}
    </div>
  )
}
