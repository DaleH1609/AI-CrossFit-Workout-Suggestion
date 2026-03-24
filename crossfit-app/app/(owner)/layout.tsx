import { OwnerSidebar } from '@/components/layout/owner-sidebar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <OwnerSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
