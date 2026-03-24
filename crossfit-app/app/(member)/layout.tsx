import { MemberNav } from '@/components/layout/member-nav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MemberNav />
      <main className="p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
