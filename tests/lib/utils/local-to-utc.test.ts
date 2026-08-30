// tests/lib/utils/local-to-utc.test.ts
import { describe, it, expect } from 'vitest'
import { localToUTC } from '@/lib/utils/local-to-utc'

/**
 * localToUTC turns a gym's wall-clock class time into the UTC instant stored
 * against a booking. Every expected value below was derived independently with
 * Intl.DateTimeFormat rather than from the function's own output, so these
 * assert the intended behaviour rather than restating the implementation.
 *
 * EU summer time in 2026 runs from Sun 29 March to Sun 25 October; US daylight
 * time from Sun 8 March to Sun 1 November.
 */

/** Wall-clock rendering of a UTC instant in a timezone — the inverse view. */
function wallClockIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}

describe('localToUTC', () => {
  it('treats a winter Dublin time as UTC+0', () => {
    expect(localToUTC('2026-01-15', '09:00', 'Europe/Dublin'))
      .toBe('2026-01-15T09:00:00.000Z')
  })

  it('shifts a summer Dublin time back an hour for IST', () => {
    // The bug this guards against is a gym's summer classes being stored an
    // hour late, which silently moves every booking reminder.
    expect(localToUTC('2026-07-15', '09:00', 'Europe/Dublin'))
      .toBe('2026-07-15T08:00:00.000Z')
  })

  it('handles a timezone behind UTC in both standard and daylight time', () => {
    expect(localToUTC('2026-01-15', '09:00', 'America/New_York'))
      .toBe('2026-01-15T14:00:00.000Z')
    expect(localToUTC('2026-07-15', '09:00', 'America/New_York'))
      .toBe('2026-07-15T13:00:00.000Z')
  })

  it('round-trips: converting to UTC and back yields the original wall clock', () => {
    // The strongest property here, and not circular — the inverse is computed
    // by Intl, not by localToUTC. Spans both sides of each DST boundary.
    const cases: Array<[string, string, string]> = [
      ['2026-01-15', '06:00', 'Europe/Dublin'],
      ['2026-03-28', '23:30', 'Europe/Dublin'],   // night before spring forward
      ['2026-03-30', '05:45', 'Europe/Dublin'],   // morning after
      ['2026-07-15', '18:15', 'Europe/Dublin'],
      ['2026-10-26', '07:00', 'Europe/Dublin'],   // day after clocks go back
      ['2026-11-02', '09:00', 'America/New_York'],
      ['2026-06-01', '12:00', 'Australia/Sydney'],
    ]
    for (const [date, time, tz] of cases) {
      const iso = localToUTC(date, time, tz)
      expect(iso, `${date} ${time} ${tz}`).not.toBeNull()
      const [y, m, d] = date.split('-')
      // en-GB renders dd/mm/yyyy, so the expected string is built in that order.
      expect(wallClockIn(iso!, tz), `${date} ${time} ${tz}`).toBe(`${d}/${m}/${y}, ${time}`)
    }
  })

  it('returns null rather than an Invalid Date for unparseable times', () => {
    // Callers persist this straight to the database, so a null they can check
    // is worth more than an ISO string built from NaN.
    expect(localToUTC('2026-01-15', 'not-a-time', 'Europe/Dublin')).toBeNull()
    expect(localToUTC('2026-01-15', '', 'Europe/Dublin')).toBeNull()
  })
})
