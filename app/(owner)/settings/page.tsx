'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dropdown } from '@/components/ui/dropdown'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

const GYM_TYPES = [
  { value: 'crossfit' as const, label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox' as const, label: 'Hyrox', description: 'Race-format training with ski erg, sleds, and functional stations' },
]

type GymSettings = {
  name: string
  timezone: string
  gym_type: 'crossfit' | 'hyrox'
  cancellation_cutoff_hours: number
  default_capacity: number
  waitlist_enabled: boolean
  booking_advance_hours: number
  show_member_names: boolean
  notify_workout_published: boolean
  notify_booking_confirmed: boolean
  contact_email: string
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const [gym, setGym] = useState<GymSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [gymTypeSaved, setGymTypeSaved] = useState(false)
  const [cutoffSaved, setCutoffSaved] = useState(false)
  const [bookingSaved, setBookingSaved] = useState(false)
  const [membersSaved, setMembersSaved] = useState(false)
  const [notifySaved, setNotifySaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError('Not authenticated'); return }
      const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
      const gymUser = userData as unknown as { gym_id: string } | null
      if (!gymUser?.gym_id) { setLoadError('No gym found for your account'); return }
      const { data, error } = await supabase.from('gyms')
        .select('name, timezone, gym_type, cancellation_cutoff_hours, default_capacity, waitlist_enabled, booking_advance_hours, show_member_names, notify_workout_published, notify_booking_confirmed, contact_email')
        .eq('id', gymUser.gym_id).single()
      if (error) { setLoadError(error.message); return }
      if (data) {
        const raw = data as unknown as Partial<GymSettings>
        setGym({
          name: raw.name ?? '',
          timezone: raw.timezone ?? 'UTC',
          gym_type: raw.gym_type ?? 'crossfit',
          cancellation_cutoff_hours: raw.cancellation_cutoff_hours ?? 0,
          default_capacity: raw.default_capacity ?? 20,
          waitlist_enabled: raw.waitlist_enabled ?? true,
          booking_advance_hours: raw.booking_advance_hours ?? 0,
          show_member_names: raw.show_member_names ?? false,
          notify_workout_published: raw.notify_workout_published ?? true,
          notify_booking_confirmed: raw.notify_booking_confirmed ?? true,
          contact_email: raw.contact_email ?? '',
        })
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(body: Record<string, unknown>, onSaved: () => void) {
    const res = await fetch('/api/settings/gym', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { onSaved(); setTimeout(onSaved, 2000) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!gym) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const gymUser = userData as unknown as { gym_id: string } | null
    await supabase.from('gyms').update({ name: gym.name, timezone: gym.timezone, contact_email: gym.contact_email || null }).eq('id', gymUser!.gym_id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loadError) return <p className="text-danger p-4">{loadError}</p>
  if (!gym) return <p className="text-secondary p-4">Loading settings…</p>

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-6">Settings</h1>
      <div className="space-y-6 max-w-md">

        {/* Gym Info */}
        <Card>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-secondary text-xs mb-1 block">Gym Name</label>
              <input value={gym.name} onChange={e => setGym(g => g ? {...g, name: e.target.value} : g)}
                className="w-full px-3 py-2 bg-background border border-border rounded-btn text-foreground focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-secondary text-xs mb-1 block">Timezone</label>
              <Dropdown
                value={gym.timezone}
                onChange={tz => setGym(g => g ? {...g, timezone: tz} : g)}
                options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
              />
            </div>
            <div>
              <label className="text-secondary text-xs mb-1 block">Contact Email</label>
              <input
                type="email"
                value={gym.contact_email}
                onChange={e => setGym(g => g ? {...g, contact_email: e.target.value} : g)}
                placeholder="hello@yourgym.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-btn text-foreground placeholder-secondary focus:outline-none focus:border-accent"
              />
              <p className="text-secondary text-xs mt-1">Used as reply-to on all outgoing emails.</p>
            </div>
            <Button type="submit">{saved ? 'Saved!' : 'Save Changes'}</Button>
          </form>
        </Card>

        {/* Gym Type */}
        <Card>
          <div className="space-y-3">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Gym Type</h2>
              {gymTypeSaved && <p className="text-accent text-xs mt-0.5">Saved!</p>}
            </div>
            <div className="space-y-2">
              {GYM_TYPES.map(({ value, label, description }) => (
                <label key={value} className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${gym.gym_type === value ? 'border-accent bg-accent-10' : 'border-border bg-background'}`}>
                  <input type="radio" name="gymType" value={value} checked={gym.gym_type === value}
                    onChange={() => {
                      setGym(g => g ? { ...g, gym_type: value } : g)
                      patch({ gymType: value }, () => setGymTypeSaved(true))
                    }}
                    className="mt-0.5 accent-accent" />
                  <div>
                    <p className="text-foreground text-sm font-semibold">{label}</p>
                    <p className="text-secondary text-xs">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Booking Rules */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Booking Rules</h2>
              <p className="text-secondary text-xs mt-0.5">Control how members can manage their bookings.</p>
              {(cutoffSaved || bookingSaved) && <p className="text-accent text-xs mt-1">Saved!</p>}
            </div>

            <div>
              <label className="text-secondary text-xs mb-1 block">Cancellation cutoff</label>
              <Dropdown
                value={String(gym.cancellation_cutoff_hours)}
                onChange={val => {
                  const num = Number(val)
                  setGym(g => g ? { ...g, cancellation_cutoff_hours: num } : g)
                  patch({ cancellationCutoffHours: num }, () => setCutoffSaved(true))
                }}
                options={[
                  { value: '0', label: 'No limit — members can cancel any time' },
                  { value: '1', label: '1 hour before class' },
                  { value: '2', label: '2 hours before class' },
                  { value: '4', label: '4 hours before class' },
                  { value: '12', label: '12 hours before class' },
                  { value: '24', label: '24 hours before class' },
                ]}
              />
            </div>

            <div>
              <label className="text-secondary text-xs mb-1 block">Booking window</label>
              <Dropdown
                value={String(gym.booking_advance_hours)}
                onChange={val => {
                  const num = Number(val)
                  setGym(g => g ? { ...g, booking_advance_hours: num } : g)
                  patch({ bookingAdvanceHours: num }, () => setBookingSaved(true))
                }}
                options={[
                  { value: '0', label: 'Always open — book any time' },
                  { value: '12', label: 'Opens 12 hours before class' },
                  { value: '24', label: 'Opens 24 hours before class' },
                  { value: '48', label: 'Opens 48 hours before class' },
                  { value: '72', label: 'Opens 72 hours before class' },
                  { value: '168', label: 'Opens 1 week before class' },
                ]}
              />
              <p className="text-secondary text-xs mt-1">How far in advance members can book a class.</p>
            </div>

            <div>
              <label className="text-secondary text-xs mb-1 block">Default class capacity</label>
              <input
                type="number"
                min={1}
                max={200}
                value={gym.default_capacity}
                onChange={e => setGym(g => g ? { ...g, default_capacity: Number(e.target.value) } : g)}
                onBlur={e => {
                  const val = Math.min(200, Math.max(1, Number(e.target.value)))
                  setGym(g => g ? { ...g, default_capacity: val } : g)
                  patch({ defaultCapacity: val }, () => setBookingSaved(true))
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-btn text-foreground focus:outline-none focus:border-accent text-sm"
              />
              <p className="text-secondary text-xs mt-1">Used as the default when creating new class slots.</p>
            </div>
          </div>
        </Card>

        {/* Members */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Members</h2>
              {membersSaved && <p className="text-accent text-xs mt-0.5">Saved!</p>}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm">Enable waitlist</p>
                <p className="text-secondary text-xs">When a class is full, members can join a waitlist.</p>
              </div>
              <Toggle
                enabled={gym.waitlist_enabled}
                onChange={val => {
                  setGym(g => g ? { ...g, waitlist_enabled: val } : g)
                  patch({ waitlistEnabled: val }, () => setMembersSaved(true))
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm">Show member names</p>
                <p className="text-secondary text-xs">Members can see who else is booked into a class.</p>
              </div>
              <Toggle
                enabled={gym.show_member_names}
                onChange={val => {
                  setGym(g => g ? { ...g, show_member_names: val } : g)
                  patch({ showMemberNames: val }, () => setMembersSaved(true))
                }}
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Notifications</h2>
              {notifySaved && <p className="text-accent text-xs mt-0.5">Saved!</p>}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm">Workout published email</p>
                <p className="text-secondary text-xs">Email members when a new week&apos;s workouts go live.</p>
              </div>
              <Toggle
                enabled={gym.notify_workout_published}
                onChange={val => {
                  setGym(g => g ? { ...g, notify_workout_published: val } : g)
                  patch({ notifyWorkoutPublished: val }, () => setNotifySaved(true))
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm">Booking confirmation email</p>
                <p className="text-secondary text-xs">Email members when their booking is confirmed.</p>
              </div>
              <Toggle
                enabled={gym.notify_booking_confirmed}
                onChange={val => {
                  setGym(g => g ? { ...g, notify_booking_confirmed: val } : g)
                  patch({ notifyBookingConfirmed: val }, () => setNotifySaved(true))
                }}
              />
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
