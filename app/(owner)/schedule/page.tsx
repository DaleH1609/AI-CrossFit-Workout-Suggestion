'use client'
import { useEffect, useState } from 'react'
import { ScheduleTemplate, ScheduleDefaults } from '@/lib/types'
import { CapacityDefaults } from '@/components/schedule/capacity-defaults'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'

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
  capacity: number
  bookings: Booking[]
}

export default function SchedulePage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [defaults, setDefaults] = useState<ScheduleDefaults>({
    globalDefault: 20,
    dayDefaults: {},
  })
  const [loading, setLoading] = useState(true)

  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [instances, setInstances] = useState<InstanceWithBookings[]>([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/schedule/templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setDefaults({
        globalDefault: data.globalDefault ?? 20,
        dayDefaults: data.dayDefaults ?? {},
      })
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [])

  useEffect(() => {
    async function loadInstances() {
      setLoadingInstances(true)
      const res = await fetch(`/api/schedule/instances?date=${attendanceDate}`)
      const data = await res.json()
      setInstances(data.instances ?? [])
      setSelectedInstanceId(null)
      setLoadingInstances(false)
    }
    loadInstances()
  }, [attendanceDate])

  async function handleAttendanceToggle(bookingId: string, current: boolean | null) {
    const next = current === null ? true : current === true ? false : null
    await fetch(`/api/bookings/${bookingId}/attend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: next }),
    })
    // Optimistically update local state
    setInstances(prev =>
      prev.map(inst => ({
        ...inst,
        bookings: inst.bookings.map(b =>
          b.id === bookingId ? { ...b, attended: next } : b
        ),
      }))
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">Loading schedule...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Class Schedule</h1>
        <p className="text-sm text-yellow-400">↻ This schedule repeats every week automatically</p>
      </div>

      <CapacityDefaults defaults={defaults} onUpdate={setDefaults} />

      <ScheduleGrid
        initialTemplates={templates}
        defaults={defaults}
      />

      {/* Attendance Section */}
      <div className="mt-10">
        <h2 className="font-bold text-xl text-white mb-4">Attendance</h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
            className="bg-zinc-800 border border-zinc-600 rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </div>

        {loadingInstances ? (
          <p className="text-secondary text-sm">Loading...</p>
        ) : instances.length === 0 ? (
          <p className="text-secondary text-sm">No classes scheduled for this date.</p>
        ) : (
          <div className="space-y-2">
            {instances.map(instance => {
              const isOpen = selectedInstanceId === instance.id
              const time = instance.local_time?.slice(0, 5) ?? instance.starts_at.slice(11, 16)
              return (
                <div key={instance.id}>
                  <button
                    onClick={() => setSelectedInstanceId(isOpen ? null : instance.id)}
                    className="w-full flex items-center justify-between bg-surface border border-accent-border rounded-card px-4 py-3 text-left hover:border-accent transition-colors"
                  >
                    <span className="text-white font-medium">{time}</span>
                    <span className="text-secondary text-sm">
                      {instance.bookings.length} / {instance.capacity} confirmed
                      {isOpen ? ' ▲' : ' ▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border border-t-0 border-accent-border rounded-b-card px-4 py-3 space-y-2">
                      {instance.bookings.length === 0 ? (
                        <p className="text-secondary text-sm">No confirmed bookings.</p>
                      ) : (
                        instance.bookings.map(booking => (
                          <div key={booking.id} className="flex items-center justify-between">
                            <span className="text-white text-sm">{booking.name}</span>
                            <button
                              onClick={() => handleAttendanceToggle(booking.id, booking.attended)}
                              className={`px-3 py-1 rounded-btn text-xs font-medium border transition-colors ${
                                booking.attended === true
                                  ? 'bg-green-500/20 border-green-600 text-green-400'
                                  : booking.attended === false
                                  ? 'bg-red-500/20 border-red-700 text-red-400'
                                  : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                              }`}
                            >
                              {booking.attended === true ? 'Attended' : booking.attended === false ? 'No-show' : 'Mark'}
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
    </div>
  )
}
