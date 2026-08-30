export const dynamic = 'force-dynamic'
import { requireMemberServerAuth } from '@/lib/auth-helpers'
import { MemberNav } from '@/components/layout/member-nav'
import { WaiverGate } from '@/components/auth/waiver-gate'
import { CommandPalette } from '@/components/ui/command-palette'

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireMemberServerAuth()
  return (
    <div className="min-h-screen bg-background">
      <WaiverGate>
        <MemberNav />
        <CommandPalette role="member" />
        <main className="p-8 pb-28 md:pb-8 max-w-7xl mx-auto page-fade-in">{children}</main>
      </WaiverGate>
    </div>
  )
}
