import { getAdminImageJobs } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'

export default async function AdminImageJobsPage() {
  const jobs = await getAdminImageJobs()

  const typeLabels: Record<string, string> = {
    enhance: 'Amélioration',
    remove_bg: 'Détourage',
    scene: 'Mise en scène',
    generate: 'Génération',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jobs Images</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Fournisseur</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {new Date(job.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3">{job.organization?.name ?? '—'}</td>
                <td className="px-4 py-3">{typeLabels[job.type] ?? job.type}</td>
                <td className="px-4 py-3 text-xs">{job.provider}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      job.status === 'completed'
                        ? 'default'
                        : job.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {job.status}
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
