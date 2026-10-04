import { getSession } from '@/lib/auth/get-session'
import { getStudioJobs, getCreditBalance } from '@/lib/queries/studio'
import { PhotoUpload } from '@/components/studio/photo-upload'
import { JobGrid } from '@/components/studio/job-grid'

export default async function StudioPage() {
  const { organization } = await getSession()
  const [jobs, credits] = await Promise.all([
    getStudioJobs(organization.id),
    getCreditBalance(organization.id),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Studio photo</h1>
      <PhotoUpload credits={credits} />
      <JobGrid jobs={jobs} />
    </div>
  )
}
