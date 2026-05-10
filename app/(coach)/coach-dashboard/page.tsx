// app/(coach)/coach-dashboard/page.tsx
// Coach view: upcoming assigned classes with roster + attendance
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Booking {
  id: string
  status: string
  users: { name: string; email: string } | null
}

interface ClassInstance {
  id: string
  starts_at: string
  capacity: number
  class_slot_templates: { name: string } | null
  bookings: Booking[]
}

export default async function CoachDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('role, gym_id, name').eq('id', user.id).single()
  const u = userData as unknown as { role: string; gym_id: string; name: string } | null
  if (!u || (u.role !== 'coach' && u.role !== 'admin' && u.role !== 'owner')) redirect('/this-week')

  const now = new Date().toISOString()
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // For admins/owners show all classes; for coaches show only assigned
  const query = supabase.from('class_instances')
    .select(`
      id, starts_at, capacity,
      class_slot_templates(name),
      bookings(id, status, users(name, email))
    `)
    .eq('gym_id', u.gym_id)
    .gte('starts_at', now)
    .lte('starts_at', twoWeeksOut)
    .order('starts_at')

  if (u.role === 'coach') query.eq('coach_id', user.id)

  const { data: instances } = await query

  const classes = (instances ?? []) as unknown as ClassInstance[]

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-8">
        {u.role === 'coach' ? 'My Classes' : 'All Upcoming Classes'}
      </h1>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-secondary text-sm">
          No upcoming classes assigned in the next two weeks.
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => {
            const confirmed = cls.bookings.filter(b => b.status === 'confirmed').length
            const dt = new Date(cls.starts_at)
            const dateStr = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

            return (
              <div key={cls.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {cls.class_slot_templates?.name ?? 'Class'}
                    </p>
                    <p className="text-sm text-secondary mt-0.5">{dateStr} at {timeStr}</p>
                  </div>
                  <span className="text-xs bg-surface-raised border border-border rounded-full px-2.5 py-1 text-secondary">
                    {confirmed}/{cls.capacity} booked
                  </span>
                </div>

                {cls.bookings.length === 0 ? (
                  <p className="text-xs text-secondary">No bookings yet</p>
                ) : (
                  <div className="space-y-1">
                    {cls.bookings
                      .filter(b => b.status !== 'cancelled')
                      .sort((a, b) => {
                        const order = ['confirmed', 'waitlisted', 'pending_confirmation']
                        return order.indexOf(a.status) - order.indexOf(b.status)
                      })
                      .map(booking => (
                        <div key={booking.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            booking.status === 'confirmed' ? 'bg-success'
                            : booking.status === 'waitlisted' ? 'bg-warning'
                            : 'bg-border'
                          }`} />
                          <span className="text-sm text-foreground flex-1">{booking.users?.name ?? booking.users?.email ?? '—'}</span>
                          <span className="text-[10px] text-secondary capitalize">{booking.status.replace('_', ' ')}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
