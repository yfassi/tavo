import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems, type MenuWithItems } from '@/lib/queries/menu'
import { CategorySection } from '@/components/carte/category-section'
import { AddCategoryDialog } from '@/components/carte/add-category-dialog'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export default async function CartePage() {
  const { venue } = await getSession()

  if (!venue) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Carte</h1>
        <p className="mt-2 text-muted-foreground">Aucun établissement configuré.</p>
      </div>
    )
  }

  const menu = await getMenuWithItems(venue.id)

  if (!menu) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Carte</h1>
        <p className="mt-2 text-muted-foreground">Aucune carte active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carte</h1>
        <div className="flex items-center gap-2">
          <Link href="/carte/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Importer une carte
            </Button>
          </Link>
          <AddCategoryDialog menuId={menu.id} />
        </div>
      </div>

      <div className="space-y-4">
        {menu.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category as MenuWithItems['categories'][number]}
          />
        ))}
      </div>

      {menu.categories.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          Votre carte est vide. Ajoutez une catégorie pour commencer.
        </p>
      )}
    </div>
  )
}
