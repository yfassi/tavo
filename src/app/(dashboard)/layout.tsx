import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { UserNav } from '@/components/dashboard/user-nav'
import { getSession } from '@/lib/auth/get-session'
import { getSubscriptionStatus } from '@/lib/stripe/guards'
import { TrialBanner } from '@/components/parametres/trial-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, venue, organization } = await getSession()
  const subStatus = await getSubscriptionStatus(organization.id)

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <main className="flex-1">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger />
          <UserNav email={user.email ?? ''} venueName={venue?.name ?? ''} />
        </header>
        {subStatus.status === 'trialing' && subStatus.trialDaysLeft !== null && (
          <div className="px-6 pt-4">
            <TrialBanner daysLeft={subStatus.trialDaysLeft} />
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
