export const dynamic = 'force-dynamic'
import { OwnerSidebar } from '@/components/layout/owner-sidebar'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <header className="sticky top-0 z-30 flex justify-end items-center gap-3 px-8 py-3 bg-background border-b border-border">
            <ThemeToggle />
            <SignOutButton />
          </header>
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
