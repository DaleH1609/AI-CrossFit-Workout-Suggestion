export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
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
      <h1 className="font-display text-3xl text-foreground mb-6">My Schedule</h1>
      {bookings.length === 0 ? (
        <p className="text-secondary">No upcoming bookings.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const inst = b.class_instances!
            const date = new Date(inst.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            const time = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            return (
              <Card key={b.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-foreground font-medium">{date}</p>
                  <p className="text-secondary text-sm">{time}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={b.status as BadgeVariant} label={b.status === 'pending_confirmation' ? 'Confirm Spot' : b.status} />
                  {b.status === 'confirmed' && <CancelBookingButton bookingId={b.id} />}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
