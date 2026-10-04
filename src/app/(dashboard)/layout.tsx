import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { UserNav } from '@/components/dashboard/user-nav'
import { getSession } from '@/lib/auth/get-session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, venue } = await getSession()

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger />
          <UserNav email={user.email ?? ''} venueName={venue?.name ?? ''} />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
