import { getAdminTemplates } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminTemplatesPage() {
  const templates = await getAdminTemplates()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Templates</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Famille</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{t.family}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
