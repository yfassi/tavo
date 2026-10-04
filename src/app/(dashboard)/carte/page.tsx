import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems, type MenuWithItems } from '@/lib/queries/menu'
import { CategorySection } from '@/components/carte/category-section'
import { AddCategoryDialog } from '@/components/carte/add-category-dialog'

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
        <AddCategoryDialog menuId={menu.id} />
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
