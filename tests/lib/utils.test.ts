// tests/lib/utils.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { getMondayOfCurrentWeek, toLocalISODate } from '@/lib/utils'

/**
 * These two decide which week an owner is shown. A bug here does not throw —
 * it quietly serves last week's programme, which is why it survived in
 * production: the app looked like it was working.
 */

afterEach(() => {
  vi.useRealTimers()
})

/** Freeze the clock at a local wall-clock moment, not a UTC one. */
function freezeLocal(y: number, monthIndex: number, d: number, h = 12, min = 0) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(y, monthIndex, d, h, min, 0, 0))
}

describe('toLocalISODate', () => {
  it('formats from local calendar parts', () => {
    expect(toLocalISODate(new Date(2026, 7, 24, 12, 0))).toBe('2026-08-24')
  })

  it('zero-pads single-digit months and days', () => {
    expect(toLocalISODate(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })

  it('does not roll back a day just after local midnight', () => {
    // The actual regression. toISOString() converts to UTC first, so at any
    // local time earlier than the UTC offset it reports yesterday. At UTC+1,
    // local 00:30 on the 24th is 23:30Z on the 23rd — and the owner was shown
    // the previous week. This must stay a local-calendar format.
    expect(toLocalISODate(new Date(2026, 7, 24, 0, 30))).toBe('2026-08-24')
    expect(toLocalISODate(new Date(2026, 7, 24, 0, 0))).toBe('2026-08-24')
    expect(toLocalISODate(new Date(2026, 7, 24, 23, 59))).toBe('2026-08-24')
  })

  it('never disagrees with the Date it was given', () => {
    // Sweep a full year of local dates; the formatted value must always match
    // the local getters, whatever timezone the suite happens to run in.
    const d = new Date(2026, 0, 1, 12, 0)
    for (let i = 0; i < 365; i++) {
      const expected =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(toLocalISODate(d)).toBe(expected)
      d.setDate(d.getDate() + 1)
    }
  })
})

describe('getMondayOfCurrentWeek', () => {
  it('returns the same day when today is Monday', () => {
    freezeLocal(2026, 7, 24) // Mon 24 Aug 2026
    expect(getMondayOfCurrentWeek()).toBe('2026-08-24')
  })

  it('returns the current week’s Monday from midweek', () => {
    freezeLocal(2026, 7, 26) // Wed 26 Aug
    expect(getMondayOfCurrentWeek()).toBe('2026-08-24')
  })

  it('treats Sunday as the end of the week, not the start', () => {
    // The edge case the -6 branch exists for. Getting this wrong sends every
    // Sunday visitor to next week's empty programme.
    freezeLocal(2026, 7, 30) // Sun 30 Aug
    expect(getMondayOfCurrentWeek()).toBe('2026-08-24')
  })

  it('crosses a month boundary correctly', () => {
    freezeLocal(2026, 8, 2) // Wed 2 Sep 2026
    expect(getMondayOfCurrentWeek()).toBe('2026-08-31')
  })

  it('holds just after local midnight', () => {
    freezeLocal(2026, 7, 24, 0, 26) // the reported failure time
    expect(getMondayOfCurrentWeek()).toBe('2026-08-24')
  })

  it('always returns a Monday, every day for a year', () => {
    const d = new Date(2026, 0, 1, 9, 0)
    for (let i = 0; i < 365; i++) {
      vi.useFakeTimers()
      vi.setSystemTime(d)
      const monday = getMondayOfCurrentWeek()
      const [y, m, day] = monday.split('-').map(Number)
      expect(new Date(y, m - 1, day).getDay(), `${toLocalISODate(d)} -> ${monday}`).toBe(1)
      vi.useRealTimers()
      d.setDate(d.getDate() + 1)
    }
  })
})
