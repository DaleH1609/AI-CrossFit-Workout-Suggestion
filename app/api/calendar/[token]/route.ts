// app/api/calendar/[token]/route.ts
// Public iCal feed — no auth required (token acts as shared secret)
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function formatDtStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response('Not found', { status: 404 })
  }

  const admin = createAdminClient()

  // Look up the user by calendar token
  const { data: userRow } = await admin.from('users')
    .select('id, gym_id, name')
    .eq('calendar_token', token)
    .maybeSingle()

  if (!userRow) {
    return new Response('Not found', { status: 404 })
  }

  // Fetch gym name for the calendar title
  const { data: gymRow } = await admin.from('gyms')
    .select('name, timezone')
    .eq('id', userRow.gym_id)
    .single()

  const gymName = gymRow?.name ?? 'CrossFit'

  // Fetch upcoming confirmed + pending_confirmation bookings
  const { data: bookingsRaw } = await admin.from('bookings')
    .select('id, status, class_instances(id, date, local_time, starts_at, capacity, name)')
    .eq('user_id', userRow.id)
    .in('status', ['confirmed', 'pending_confirmation'])
    .order('created_at', { ascending: true })

  const now = new Date()
  const bookings = ((bookingsRaw ?? []) as Array<{
    id: string
    status: string
    class_instances: { id: string; date: string; local_time: string; starts_at: string; capacity: number; name?: string | null } | null
  }>).filter(b => b.class_instances && new Date(b.class_instances.starts_at) > now)

  // Build iCal
  const dtstamp = formatDtStamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//KOVA//CrossFit Calendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(gymName + ' Classes')}`,
    `X-WR-CALDESC:${escape(`Your upcoming classes at ${gymName}`)}`,
    'X-WR-TIMEZONE:UTC',
  ]

  for (const b of bookings) {
    const inst = b.class_instances!
    const dtstart = formatDtStamp(new Date(inst.starts_at))
    // 1-hour class by default
    const dtend = formatDtStamp(new Date(new Date(inst.starts_at).getTime() + 60 * 60 * 1000))
    const title = inst.name ? `${gymName} — ${inst.name}` : `${gymName} Class`
    const uid = `booking-${b.id}@kova.app`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(b.status === 'pending_confirmation' ? 'Spot held — confirm via email link.' : 'Confirmed booking')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n') + '\r\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gymName.replace(/[^a-z0-9]/gi, '-')}-classes.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
