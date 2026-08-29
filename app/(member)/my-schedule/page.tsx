export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { CancelBookingButton } from '@/components/booking/cancel-booking-button'
import { ClassFeedback } from '@/components/booking/class-feedback'
import { ClassRoster } from '@/components/booking/class-roster'
import { ClassBookingCalendar } from '@/components/booking/class-booking-calendar'
import { CalendarPlus } from '@phosphor-icons/react/dist/ssr'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

interface BookingRow {
  id: string
  status: string
  instance_id: string
  class_instances: { date: string; local_time: string; starts_at: string } | null
}

interface FeedbackRow {
  instance_id: string
  rating: number
}

export default async function MySchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const past14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: bookingsRaw }, { data: userProfile }] = await Promise.all([
    supabase.from('bookings')
      .select('id, status, instance_id, class_instances(date, local_time, starts_at)')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
      .order('created_at', { ascending: true }),
    supabase.from('users').select('calendar_token').eq('id', user.id).single(),
  ])
  const calendarToken = (userProfile as unknown as { calendar_token?: string } | null)?.calendar_token

  const allBookings = (bookingsRaw ?? []) as unknown as BookingRow[]

  const bookings = allBookings
    .filter(b => (b.class_instances?.date ?? '') >= today)
    .sort((a, b) => new Date(a.class_instances!.starts_at).getTime() - new Date(b.class_instances!.starts_at).getTime())

  // Past confirmed classes in the last 14 days — candidates for feedback
  const pastBookings = allBookings
    .filter(b => b.status === 'confirmed' && b.class_instances && b.class_instances.starts_at < today && b.class_instances.starts_at >= past14)
    .sort((a, b) => new Date(b.class_instances!.starts_at).getTime() - new Date(a.class_instances!.starts_at).getTime())

  // Fetch existing feedback for these instances
  const pastInstanceIds = pastBookings.map(b => b.instance_id).filter(Boolean)
  const existingFeedback: Record<string, number> = {}
  if (pastInstanceIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from('class_feedback')
      .select('instance_id, rating')
      .eq('user_id', user.id)
      .in('instance_id', pastInstanceIds)
    for (const f of (feedbackRows ?? []) as unknown as FeedbackRow[]) {
      existingFeedback[f.instance_id] = f.rating
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)]">My schedule</h1>
        {calendarToken && (
          <a
            href={`/api/calendar/${calendarToken}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-border text-xs text-secondary hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <CalendarPlus size={13} />
            Add to Calendar
          </a>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-2xl text-border mb-2">-</p>
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
                  {isConfirmed && <ClassRoster instanceId={b.instance_id} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent past classes - prompt for feedback */}
      {pastBookings.length > 0 && (
        <div className="mt-12 max-w-lg">
          <h2 className="text-sm font-semibold text-foreground mb-5">Recent classes</h2>
          <div className="space-y-4">
            {pastBookings.map(b => {
              const inst = b.class_instances!
              const dateLabel = new Date(inst.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              const timeLabel = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const existingRating = existingFeedback[b.instance_id]
              return (
                <div key={b.id} className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs text-secondary uppercase tracking-widest">{dateLabel}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{timeLabel}</p>
                  {existingRating ? (
                    <p className="mt-2 text-xs text-secondary flex items-center gap-1">
                      <span className="text-accent">{'★'.repeat(existingRating)}{'☆'.repeat(5 - existingRating)}</span>
                      <span>Rated</span>
                    </p>
                  ) : (
                    <ClassFeedback instanceId={b.instance_id} classTime={timeLabel} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
