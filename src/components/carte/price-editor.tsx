'use client'

import { useState, useTransition } from 'react'
import { updatePrice, addPrice, deletePrice } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPriceRaw } from '@/lib/format'
import type { MenuItemPrice } from '@/lib/types/menu'
import { Trash2, Plus } from 'lucide-react'

export function PriceEditor({ itemId, prices }: { itemId: string; prices: MenuItemPrice[] }) {
  const [isPending, startTransition] = useTransition()
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')

  function handleUpdatePrice(priceId: string, rawValue: string) {
    const cents = Math.round(parseFloat(rawValue.replace(',', '.')) * 100)
    if (isNaN(cents) || cents < 0) return
    startTransition(() => {
      updatePrice(priceId, cents)
    })
  }

  function handleAddPrice() {
    const cents = Math.round(parseFloat(newAmount.replace(',', '.')) * 100)
    if (isNaN(cents) || cents < 0 || !newLabel.trim()) return
    startTransition(() => {
      addPrice(itemId, newLabel.trim(), cents)
    })
    setNewLabel('')
    setNewAmount('')
  }

  function handleDeletePrice(priceId: string) {
    startTransition(() => {
      deletePrice(priceId)
    })
  }

  return (
    <div className={`space-y-2 ${isPending ? 'opacity-50' : ''}`}>
      {prices.map((price) => (
        <div key={price.id} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">{price.label}</span>
          <Input
            className="w-24"
            defaultValue={formatPriceRaw(price.amount_cents)}
            onBlur={(e) => handleUpdatePrice(price.id, e.target.value)}
          />
          <span className="text-sm text-muted-foreground">€</span>
          {prices.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeletePrice(price.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          className="w-16"
          placeholder="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <Input
          className="w-24"
          placeholder="0,00"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleAddPrice}
          disabled={!newLabel || !newAmount}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
