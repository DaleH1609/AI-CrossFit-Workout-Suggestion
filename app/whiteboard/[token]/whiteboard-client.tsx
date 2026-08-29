'use client'
import { useState, useEffect } from 'react'
import type { WorkoutDay } from '@/lib/types'

interface ClassInstance {
  id: string
  date: string
  local_time: string
  starts_at: string
  capacity: number
  name?: string | null
}

interface BookingRow {
  user_id: string
  status: string
  attended: boolean | null
  users: { name: string } | null
  instance_id?: string
}

interface Props {
  gymName: string
  today: string
  timezone: string
  todayWorkout: WorkoutDay | null
  instances: ClassInstance[]
  bookings: BookingRow[]
  checkinCodes?: Record<string, string>
}

function Clock({ timezone }: { timezone: string }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    function update() {
      try {
        setTime(new Date().toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }))
      } catch {
        setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timezone])

  return <span>{time}</span>
}

export function WhiteboardClient({ gymName, today, timezone, todayWorkout, instances, bookings, checkinCodes = {} }: Props) {
  const [, forceRefresh] = useState(0)

  // Auto-refresh the page every 60 seconds to pick up new bookings
  useEffect(() => {
    const id = setInterval(() => {
      window.location.reload()
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const dayLabel = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'
  })

  // Upcoming classes: sort by time, highlight next class
  const now = new Date()
  const upcoming = instances.filter(i => new Date(i.starts_at) > new Date(now.getTime() - 90 * 60 * 1000))
  const nextClass = upcoming.find(i => new Date(i.starts_at) > now) ?? upcoming[0] ?? null

  return (
    <div
      className="min-h-screen bg-[#080808] text-white flex flex-col"
      style={{ fontFamily: "'system-ui', sans-serif" }}
      onClick={() => forceRefresh(v => v + 1)}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-10 pt-8 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">{gymName}</h1>
          <p className="text-white/50 text-lg mt-1">{dayLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-bold text-[#b8952a]">
            <Clock timezone={timezone} />
          </p>
        </div>
      </header>

      <div className="flex flex-1 gap-0">
        {/* Left: Today's Workout */}
        <section className="flex-1 px-10 py-8 border-r border-white/10">
          <h2 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-6">
            Today&apos;s Workout
            {todayWorkout?.descriptor && (
              <span className="ml-3 text-[#b8952a]">- {todayWorkout.descriptor}</span>
            )}
          </h2>

          {todayWorkout ? (
            <div className="space-y-6">
              {todayWorkout.parts.map((part, i) => (
                <div key={i}>
                  {part.label && (
                    <p className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-2">{part.label}</p>
                  )}
                  <pre className="text-white text-xl font-light leading-relaxed whitespace-pre-wrap font-sans">
                    {part.content}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-2xl font-light">No workout published yet</p>
          )}
        </section>

        {/* Right: Classes & Roster */}
        <section className="w-80 xl:w-96 px-8 py-8 flex flex-col gap-8">
          <div>
            <h2 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-5">Today&apos;s Classes</h2>
            {upcoming.length === 0 ? (
              <p className="text-white/30">No classes scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(inst => {
                  const isNext = inst.id === nextClass?.id
                  const time = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })
                  const confirmed = bookings.filter(b => b.instance_id === inst.id && (b.status === 'confirmed' || b.status === 'pending_confirmation')).length
                  const checkedIn = bookings.filter(b => b.instance_id === inst.id && b.attended === true).length

                  return (
                    <div
                      key={inst.id}
                      className={`rounded-lg px-4 py-3 border transition-colors ${isNext
                        ? 'border-[#b8952a]/50 bg-[#b8952a]/10'
                        : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-lg font-semibold ${isNext ? 'text-[#b8952a]' : 'text-white'}`}>{time}</p>
                        {isNext && <span className="text-[10px] font-bold tracking-widest text-[#b8952a] uppercase">Next</span>}
                      </div>
                      {inst.name && <p className="text-sm text-white/60 mt-0.5">{inst.name}</p>}
                      <div className="flex items-center gap-3 mt-2 text-sm text-white/50">
                        <span>{confirmed} / {inst.capacity} booked</span>
                        {checkedIn > 0 && <span className="text-green-400">{checkedIn} in</span>}
                      </div>
                      {isNext && checkinCodes[inst.id] && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-1">Check-in code</p>
                          <p className="font-mono text-2xl font-bold tracking-[0.3em] text-[#b8952a]">
                            {checkinCodes[inst.id]}
                          </p>
                          <p className="text-[9px] text-white/20 mt-0.5">Open kova.app/check-in on your phone</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Roster for next class */}
          {nextClass && (
            <div>
              <h2 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
                Next Class - Roster
              </h2>
              <div className="space-y-2">
                {bookings
                  .filter(b => b.instance_id === nextClass.id && (b.status === 'confirmed' || b.status === 'pending_confirmation'))
                  .map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.attended ? 'bg-green-400' : 'bg-white/20'}`} />
                      <span className={`text-sm ${b.attended ? 'text-white' : 'text-white/60'}`}>
                        {b.users?.name ?? 'Member'}
                      </span>
                    </div>
                  ))}
                {bookings.filter(b => b.instance_id === nextClass.id).length === 0 && (
                  <p className="text-white/30 text-sm">No bookings yet</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="px-10 py-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-white/20 text-xs tracking-widest uppercase">KOVA</p>
        <p className="text-white/20 text-xs">Auto-refreshes every minute · Click to refresh now</p>
      </footer>
    </div>
  )
}
