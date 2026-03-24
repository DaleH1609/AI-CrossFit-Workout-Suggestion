import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function MySchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookingsRaw } = await supabase.from('bookings')
    .select('*, class_instances(date, local_time, starts_at)')
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .order('created_at', { ascending: true })

  // Filter to upcoming only (class date >= today) and sort by starts_at
  const today = new Date().toISOString().split('T')[0]
  const bookings = ((bookingsRaw ?? []) as any[])
    .filter(b => b.class_instances?.date >= today)
    .sort((a, b) => new Date(a.class_instances.starts_at).getTime() - new Date(b.class_instances.starts_at).getTime())

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">My Schedule</h1>
      {bookings.length === 0 ? (
        <p className="text-secondary">No upcoming bookings.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const inst = b.class_instances
            const date = new Date(inst.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            const time = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            return (
              <Card key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{date}</p>
                  <p className="text-secondary text-sm">{time}</p>
                </div>
                <Badge variant={b.status} label={b.status === 'pending_confirmation' ? 'Confirm Spot' : b.status} />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
