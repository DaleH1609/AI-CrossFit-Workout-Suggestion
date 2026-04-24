// app/(admin)/layout.tsx
export const dynamic = 'force-dynamic'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { ToastProvider } from '@/components/ui/toast'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAuth() // defence in depth — redirects to /login if not admin
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="md:ml-16 flex flex-col min-h-screen">
          <main className="flex-1 p-8 page-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
