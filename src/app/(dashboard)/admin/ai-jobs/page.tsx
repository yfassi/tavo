import { getAdminAiJobs } from '@/lib/queries/admin'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/format'

export default async function AdminAiJobsPage() {
  const jobs = await getAdminAiJobs()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jobs IA</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Modèle</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Coût</th>
              <th className="px-4 py-3 text-left font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {new Date(job.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3">{job.organization?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{job.type}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{job.model ?? '—'}</td>
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
                <td className="px-4 py-3">{job.cost_cents ? formatPrice(job.cost_cents) : '—'}</td>
                <td className="px-4 py-3">{job.tokens_used ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
