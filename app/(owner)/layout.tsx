export const dynamic = 'force-dynamic'
import { requireOwnerServerAuth } from '@/lib/auth-helpers'
import { OwnerSidebar } from '@/components/layout/owner-sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { CommandPalette } from '@/components/ui/command-palette'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireOwnerServerAuth()
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <OwnerSidebar />
        <CommandPalette role="owner" />
        {/* md:ml-16 matches the collapsed sidebar width (w-16 = 64px) */}
        <div className="md:ml-16 flex flex-col min-h-screen">
          <main className="flex-1 p-8 page-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
