'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Users, Warning } from '@phosphor-icons/react'

import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

type Slot = {
  id: string
  date: string
  localTime: string
  startsAt: string
  name: string | null
  capacity: number
  booked: number
  myStatus: string | null
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "18:30:00" -> "18:30". Times come back as Postgres `time`. */
const hhmm = (t: string) => t.slice(0, 5)

export function ClassBookingCalendar() {
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | undefined>(() => new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/availability?month=${monthKey}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? 'Could not load classes')
      setSlots(body.instances ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load classes')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  useEffect(() => { void load() }, [load])

  const byDate = useMemo(() => {
    const m = new Map<string, Slot[]>()
    for (const s of slots) {
      const list = m.get(s.date) ?? []
      list.push(s)
      m.set(s.date, list)
    }
    return m
  }, [slots])

  // Days the calendar should grey out: no classes scheduled, or every class
  // that day is at capacity. Both are "nothing to book here", and striking
  // them through is clearer than letting someone click into an empty column.
  const disabledDays = useMemo(() => {
    const days: Date[] = []
    for (const [date, list] of byDate) {
      if (list.every((s) => s.booked >= s.capacity && !s.myStatus)) {
        const [y, m, d] = date.split('-').map(Number)
        days.push(new Date(y, m - 1, d))
      }
    }
    return days
  }, [byDate])

  const daysWithClasses = useMemo(() => {
    return Array.from(byDate.keys()).map((date) => {
      const [y, m, d] = date.split('-').map(Number)
      return new Date(y, m - 1, d)
    })
  }, [byDate])

  const daySlots = selected ? (byDate.get(iso(selected)) ?? []) : []

  async function book(slot: Slot) {
    setBusyId(slot.id)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: slot.id }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? 'Booking failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-card-lg p-1.5 ring-1 ring-border bg-surface-raised/40">
      <div className="rounded-card bg-surface shadow-ambient shadow-inset-hi">
        <div className="border-b border-border px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Book a class</p>
        </div>

        <div className="relative md:pr-56">
          <div className="p-6">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              month={month}
              onMonthChange={setMonth}
              disabled={disabledDays}
              showOutsideDays={false}
              modifiers={{ hasClasses: daysWithClasses }}
              modifiersClassNames={{
                // A day with classes gets a subtle raised ground, so the month
                // reads at a glance without needing a legend.
                hasClasses: '[&>button]:bg-surface-raised/70',
              }}
              className="bg-transparent p-0"
              formatters={{
                formatWeekdayName: (d) => d.toLocaleString('en-GB', { weekday: 'short' }),
              }}
            />
          </div>

          <div className="inset-y-0 right-0 flex w-full flex-col border-t border-border max-md:h-72 md:absolute md:w-56 md:border-t-0 md:border-l">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-2 p-5">
                {loading && (
                  <div className="space-y-2" aria-live="polite" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-11 animate-pulse rounded-btn bg-surface-raised" />
                    ))}
                    <span className="sr-only">Loading classes</span>
                  </div>
                )}

                {!loading && daySlots.length === 0 && (
                  <p className="px-1 py-6 text-center text-sm text-secondary text-pretty">
                    No classes on this day.
                  </p>
                )}

                {!loading &&
                  daySlots.map((s) => {
                    const full = s.booked >= s.capacity
                    const mine = Boolean(s.myStatus)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => book(s)}
                        disabled={mine || (full && !mine) || busyId === s.id}
                        className={`flex w-full touch-manipulation flex-col gap-1 rounded-btn border px-3 py-2.5 text-left transition-colors duration-200 ease-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed ${
                          mine
                            ? 'border-accent/40 bg-accent-10'
                            : full
                              ? 'border-border bg-surface-raised/50 opacity-60'
                              : 'border-border hover:border-accent/50 hover:bg-surface-raised'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm tabular-nums text-foreground">
                            {hhmm(s.localTime)}
                          </span>
                          {mine && <CheckCircle size={15} weight="fill" className="text-accent" />}
                          {!mine && full && <Warning size={14} className="text-secondary" />}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-secondary">
                          <Users size={12} />
                          <span className="tabular-nums">
                            {s.booked}/{s.capacity}
                          </span>
                          {mine && <span className="ml-auto text-accent">Booked</span>}
                          {!mine && full && <span className="ml-auto">Full</span>}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {error && (
          <div role="alert" className="border-t border-danger/30 bg-danger-10 px-6 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Shown when the gym has published no classes at all. */
export function NoClassesEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No classes scheduled</EmptyTitle>
        <EmptyDescription>
          Your gym has not published a schedule yet. Once they do, classes appear here to book.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
