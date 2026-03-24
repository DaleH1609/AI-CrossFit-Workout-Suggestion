import { OwnerSidebar } from '@/components/layout/owner-sidebar'
import { ToastProvider } from '@/components/ui/toast'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <OwnerSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  )
}
