export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { CancelBookingButton } from '@/components/booking/cancel-booking-button'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

interface BookingRow {
  id: string
  status: string
  class_instances: { date: string; local_time: string; starts_at: string } | null
}

export default async function MySchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookingsRaw } = await supabase.from('bookings')
    .select('*, class_instances(date, local_time, starts_at)')
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .order('created_at', { ascending: true })

  const today = new Date().toISOString().split('T')[0]
  const bookings = ((bookingsRaw ?? []) as unknown as BookingRow[])
    .filter(b => (b.class_instances?.date ?? '') >= today)
    .sort((a, b) => new Date(a.class_instances!.starts_at).getTime() - new Date(b.class_instances!.starts_at).getTime())

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-8">My Schedule</h1>

      {bookings.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-2xl text-border mb-2">—</p>
          <p className="text-secondary text-sm">No upcoming bookings.</p>
          <p className="text-secondary/50 text-xs mt-1">Book a class from This Week to see it here.</p>
        </div>
      ) : (
        <div className="relative pl-8 max-w-lg">
          {/* Vertical timeline rail */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />

          {bookings.map((b) => {
            const inst = b.class_instances!
            const isConfirmed = b.status === 'confirmed'
            const isWaitlisted = b.status === 'waitlisted'
            const date = new Date(inst.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            const time = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

            return (
              <div key={b.id} className={`relative mb-7 ${isWaitlisted ? 'opacity-60' : ''}`}>
                {/* Timeline dot */}
                <div className={`absolute -left-8 top-1 w-2.5 h-2.5 rounded-full border-2 translate-x-[-4px] transition-colors ${isConfirmed ? 'border-accent bg-accent' : 'border-border bg-background'}`} />

                {/* Content with left border accent */}
                <div className={`border-l-2 pl-5 ${isConfirmed ? 'border-accent' : 'border-border'}`}>
                  <p className="text-[10px] font-semibold tracking-widest text-secondary uppercase mb-0.5">
                    {date}
                  </p>
                  <p className="text-foreground font-medium">{time}</p>
                  {isWaitlisted && (
                    <p className="text-xs text-secondary italic mt-0.5">You&apos;re on the waitlist</p>
                  )}

                  <div className="flex items-center gap-3 mt-2.5">
                    <Badge variant={b.status as BadgeVariant} label={b.status === 'pending_confirmation' ? 'Confirm Spot' : b.status} />
                    {isConfirmed && <CancelBookingButton bookingId={b.id} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
