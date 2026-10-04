import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getSession()

  if (role !== 'admin') {
    redirect('/carte')
  }

  return (
    <div>
      <nav className="mb-6 flex gap-4 border-b pb-3">
        <a href="/admin" className="text-sm font-medium hover:underline">
          Tableau de bord
        </a>
        <a href="/admin/clients" className="text-sm font-medium hover:underline">
          Clients
        </a>
        <a href="/admin/templates" className="text-sm font-medium hover:underline">
          Templates
        </a>
        <a href="/admin/ai-jobs" className="text-sm font-medium hover:underline">
          Jobs IA
        </a>
        <a href="/admin/image-jobs" className="text-sm font-medium hover:underline">
          Jobs Images
        </a>
      </nav>
      {children}
    </div>
  )
}
