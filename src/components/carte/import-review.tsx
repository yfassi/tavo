'use client'

import { useState, useTransition } from 'react'
import { confirmImport } from '@/lib/actions/import'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImportItemRow } from './import-item-row'
import { Check, ArrowLeft } from 'lucide-react'
import type { MenuImportResult } from '@/lib/ai/schemas'

interface ImportReviewProps {
  menuId: string
  initialData: MenuImportResult
  onBack: () => void
}

export function ImportReview({ menuId, initialData, onBack }: ImportReviewProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const totalItems = data.categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const uncertainItems = data.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.uncertain).length,
    0,
  )
  const uncertainPrices = data.categories.reduce(
    (sum, cat) =>
      sum + cat.items.reduce((s, i) => s + i.prices.filter((p) => p.uncertain).length, 0),
    0,
  )

  function updateCategory(catIndex: number, name: string) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = { ...newData.categories[catIndex], name }
    setData(newData)
  }

  function updateItem(
    catIndex: number,
    itemIndex: number,
    item: MenuImportResult['categories'][0]['items'][0],
  ) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = {
      ...newData.categories[catIndex],
      items: [...newData.categories[catIndex].items],
    }
    newData.categories[catIndex].items[itemIndex] = item
    setData(newData)
  }

  function deleteItem(catIndex: number, itemIndex: number) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = {
      ...newData.categories[catIndex],
      items: newData.categories[catIndex].items.filter((_, i) => i !== itemIndex),
    }
    // Remove empty categories
    newData.categories = newData.categories.filter((c) => c.items.length > 0)
    setData(newData)
  }

  function deleteCategory(catIndex: number) {
    const newData = { ...data }
    newData.categories = newData.categories.filter((_, i) => i !== catIndex)
    setData(newData)
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmImport(menuId, data)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="text-sm text-muted-foreground">
          {totalItems} plat{totalItems > 1 ? 's' : ''} détecté{totalItems > 1 ? 's' : ''}
          {uncertainItems > 0 && (
            <span className="ml-2 text-yellow-600">({uncertainItems} à vérifier)</span>
          )}
          {uncertainPrices > 0 && (
            <span className="ml-2 text-yellow-600">
              ({uncertainPrices} prix incertain{uncertainPrices > 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>

      {data.categories.map((category, catIndex) => (
        <Card key={catIndex}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Input
                className="text-lg font-semibold border-none bg-transparent p-0 h-auto"
                value={category.name}
                onChange={(e) => updateCategory(catIndex, e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive text-xs"
                onClick={() => deleteCategory(catIndex)}
              >
                Supprimer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {category.items.map((item, itemIndex) => (
              <ImportItemRow
                key={itemIndex}
                item={item}
                onChange={(updated) => updateItem(catIndex, itemIndex, updated)}
                onDelete={() => deleteItem(catIndex, itemIndex)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleConfirm}
        disabled={isPending || totalItems === 0}
        className="w-full"
        size="lg"
      >
        <Check className="mr-2 h-4 w-4" />
        {isPending
          ? 'Import en cours...'
          : `Importer ${totalItems} plat${totalItems > 1 ? 's' : ''}`}
      </Button>
    </div>
  )
}
