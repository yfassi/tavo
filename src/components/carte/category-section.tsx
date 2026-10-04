'use client'

import { useState, useTransition } from 'react'
import { updateCategory, deleteCategory } from '@/lib/actions/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { ItemRow } from './item-row'
import { AddItemDialog } from './add-item-dialog'
import type { MenuCategory, MenuItem, MenuItemPrice, MenuItemAllergen } from '@/lib/types/menu'

interface CategorySectionProps {
  category: MenuCategory & {
    items: (MenuItem & { prices: MenuItemPrice[]; allergens: MenuItemAllergen[] })[]
  }
}

export function CategorySection({ category }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isPending, startTransition] = useTransition()

  function handleNameBlur(value: string) {
    if (value !== category.name) {
      startTransition(() => updateCategory(category.id, { name: value }))
    }
  }

  function handleDelete() {
    if (confirm(`Supprimer la catégorie "${category.name}" et tous ses plats ?`)) {
      startTransition(() => deleteCategory(category.id))
    }
  }

  return (
    <div className={`rounded-xl border bg-card ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 p-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <Input
          className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          defaultValue={category.name}
          onBlur={(e) => handleNameBlur(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {category.items.length} plat{category.items.length > 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-2 px-4 pb-4">
          {category.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          <AddItemDialog categoryId={category.id} />
        </div>
      )}
    </div>
  )
}
