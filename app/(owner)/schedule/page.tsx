'use client'
import { useEffect, useRef, useState } from 'react'
import type { ClassType, ScheduleDefaults, ScheduleTemplate } from '@/lib/types'
import { CapacityDefaults } from '@/components/schedule/capacity-defaults'
import { ClassTypesManager } from '@/components/schedule/class-types-manager'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'
import { useToast } from '@/components/ui/toast'

interface Booking {
  id: string
  user_id: string
  attended: boolean | null
  name: string
}

interface InstanceWithBookings {
  id: string
  starts_at: string
  local_time: string
  name: string
  capacity: number
  coach_id: string | null
  coachName: string | null
  bookings: Booking[]
}

interface Coach {
  id: string
  name: string
  email: string
}

type Tab = 'schedule' | 'attendance'

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>('schedule')
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [defaults, setDefaults] = useState<ScheduleDefaults>({ globalDefault: 20, dayDefaults: {} })
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [loading, setLoading] = useState(true)

  const [attendanceDate, setAttendanceDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [instances, setInstances] = useState<InstanceWithBookings[]>([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const { toast } = useToast()
  const tabListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [templatesRes, typesRes, coachesRes] = await Promise.all([
          fetch('/api/schedule/templates'),
          fetch('/api/class-types'),
          fetch('/api/admin/coaches'),
        ])
        if (!templatesRes.ok || !typesRes.ok) {
          toast('Failed to load schedule', 'error')
          setLoading(false)
          return
        }
        const templatesData = await templatesRes.json()
        const typesData = await typesRes.json()
        setTemplates(templatesData.templates ?? [])
        setDefaults({
          globalDefault: templatesData.globalDefault ?? 20,
          dayDefaults: templatesData.dayDefaults ?? {},
        })
        setClassTypes(typesData.classTypes ?? [])
        if (coachesRes.ok) setCoaches(await coachesRes.json() ?? [])
      } catch (err) {
        console.error('[schedule] load failed', err)
        toast('Network error - could not load schedule', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  useEffect(() => {
    if (activeTab !== 'attendance') return
    let cancelled = false
    async function loadInstances() {
      setLoadingInstances(true)
      try {
        const res = await fetch(`/api/schedule/instances?date=${attendanceDate}`)
        if (!res.ok) {
          if (!cancelled) toast('Failed to load attendance', 'error')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setInstances(data.instances ?? [])
        setSelectedInstanceId(null)
      } catch (err) {
        if (!cancelled) {
          console.error('[schedule] instances load failed', err)
          toast('Network error - could not load attendance', 'error')
        }
      } finally {
        if (!cancelled) setLoadingInstances(false)
      }
    }
    loadInstances()
    return () => { cancelled = true }
  }, [attendanceDate, activeTab, toast])

  async function handleAttendanceToggle(bookingId: string, current: boolean | null) {
    const next = current === null ? true : current === true ? false : null
    // Optimistic update so the UI responds instantly.
    setInstances(prev =>
      prev.map(inst => ({
        ...inst,
        bookings: inst.bookings.map(b =>
          b.id === bookingId ? { ...b, attended: next } : b
        ),
      }))
    )
    try {
      const res = await fetch(`/api/bookings/${bookingId}/attend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: next }),
      })
      if (!res.ok) {
        // Revert on failure.
        setInstances(prev =>
          prev.map(inst => ({
            ...inst,
            bookings: inst.bookings.map(b =>
              b.id === bookingId ? { ...b, attended: current } : b
            ),
          }))
        )
        toast('Failed to update attendance', 'error')
      }
    } catch (err) {
      console.error('[schedule] attend toggle failed', err)
      setInstances(prev =>
        prev.map(inst => ({
          ...inst,
          bookings: inst.bookings.map(b =>
            b.id === bookingId ? { ...b, attended: current } : b
          ),
        }))
      )
      toast('Network error - could not update attendance', 'error')
    }
  }

  async function handleCoachAssign(instanceId: string, coachId: string | null) {
    const prev = instances.find(i => i.id === instanceId)
    const coachName = coachId ? (coaches.find(c => c.id === coachId)?.name ?? null) : null
    setInstances(all => all.map(i => i.id === instanceId ? { ...i, coach_id: coachId, coachName } : i))
    const res = await fetch(`/api/schedule/instances/${instanceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId }),
    })
    if (!res.ok) {
      setInstances(all => all.map(i => i.id === instanceId ? { ...i, coach_id: prev?.coach_id ?? null, coachName: prev?.coachName ?? null } : i))
      toast('Failed to assign coach', 'error')
    }
  }

  // Keyboard nav on the tablist: left/right arrows cycle tabs.
  function handleTabKey(e: React.KeyboardEvent, current: Tab) {
    const tabs: Tab[] = ['schedule', 'attendance']
    const idx = tabs.indexOf(current)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveTab(tabs[(idx + 1) % tabs.length])
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length])
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveTab(tabs[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveTab(tabs[tabs.length - 1])
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)]">Class schedule</h1>
        <p className="text-secondary text-sm mt-1">Weekly recurring schedule and attendance tracking.</p>
      </div>

      {/* Tab bar - WAI-ARIA tabs pattern */}
      <div ref={tabListRef} role="tablist" aria-label="Schedule sections" className="flex gap-1 mb-8 border-b border-border">
        {(['schedule', 'attendance'] as const).map(tab => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              id={`tab-${tab}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={e => handleTabKey(e, tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors relative ${
                isActive
                  ? 'text-foreground'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              {tab}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-accent" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'schedule' && (
        <div role="tabpanel" id="panel-schedule" aria-labelledby="tab-schedule">
          {loading ? (
            <div className="space-y-4">
              {[120, 80, 320].map(h => (
                <div key={h} className="h-[var(--h)] bg-surface border border-border rounded-card animate-pulse" style={{ ['--h' as string]: `${h}px` }} />
              ))}
            </div>
          ) : (
            <>
              <ClassTypesManager classTypes={classTypes} onChange={setClassTypes} />
              <CapacityDefaults defaults={defaults} onUpdate={setDefaults} />
              <ScheduleGrid
                initialTemplates={templates}
                defaults={defaults}
                classTypes={classTypes}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div role="tabpanel" id="panel-attendance" aria-labelledby="tab-attendance">
          <div className="flex items-center gap-3 mb-6">
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="bg-surface border border-border rounded-btn px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
            />
            <span className="text-secondary text-sm">
              {new Date(attendanceDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {loadingInstances ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-surface border border-border rounded-card animate-pulse" />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-secondary text-sm">No classes scheduled for this date.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {instances.map(instance => {
                const isOpen = selectedInstanceId === instance.id
                const time = instance.local_time?.slice(0, 5) ?? instance.starts_at.slice(11, 16)
                const confirmedCount = instance.bookings.filter(b => b.attended !== false).length
                return (
                  <div key={instance.id}>
                    <button
                      onClick={() => setSelectedInstanceId(isOpen ? null : instance.id)}
                      className="w-full flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3 text-left hover:border-accent-40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-semibold tabular-nums text-sm">{time}</span>
                        {instance.name && instance.name !== 'WOD' && (
                          <span className="text-xs text-accent border border-accent-30 bg-accent-5 rounded px-1.5 py-0.5">
                            {instance.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {instance.coachName && (
                          <span className="text-xs text-accent/70">{instance.coachName}</span>
                        )}
                        <span className="text-secondary text-xs tabular-nums">
                          {confirmedCount} / {instance.capacity}
                        </span>
                        <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                          className={`text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border border-t-0 border-border rounded-b-card px-4 py-3 space-y-2 bg-background">
                        {coaches.length > 0 && (
                          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <span className="text-xs text-secondary shrink-0">Coach:</span>
                            <select
                              value={instance.coach_id ?? ''}
                              onChange={e => handleCoachAssign(instance.id, e.target.value || null)}
                              className="flex-1 text-xs bg-surface border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-accent"
                            >
                              <option value="">- unassigned -</option>
                              {coaches.map(c => (
                                <option key={c.id} value={c.id}>{c.name || c.email}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {instance.bookings.length === 0 ? (
                          <p className="text-secondary text-sm italic">No confirmed bookings.</p>
                        ) : (
                          instance.bookings.map(booking => (
                            <div key={booking.id} className="flex items-center justify-between py-0.5">
                              <span className="text-foreground text-sm">{booking.name}</span>
                              <button
                                type="button"
                                onClick={() => handleAttendanceToggle(booking.id, booking.attended)}
                                aria-pressed={booking.attended === true}
                                aria-label={`${booking.name} attendance - ${
                                  booking.attended === true
                                    ? 'attended'
                                    : booking.attended === false
                                    ? 'no-show'
                                    : 'not marked'
                                }`}
                                className={`px-3 py-1 rounded-btn text-xs font-medium border transition-colors active:scale-[0.97] ${
                                  booking.attended === true
                                    ? 'bg-success-20 border-success-40 text-success'
                                    : booking.attended === false
                                    ? 'bg-danger-20 border-danger-40 text-danger'
                                    : 'bg-surface border-border text-secondary hover:text-foreground'
                                }`}
                              >
                                {booking.attended === true ? '✓ Attended' : booking.attended === false ? '✗ No-show' : 'Mark'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
