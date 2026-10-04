import { getAdminClients } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminClientsPage() {
  const clients = await getAdminClients()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Membres</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{client.subscriptions?.[0]?.plan ?? '—'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      client.subscriptions?.[0]?.status === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {client.subscriptions?.[0]?.status ?? '—'}
                  </Badge>
                </td>
                <td className="px-4 py-3">{client.memberships?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
