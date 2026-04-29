'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dropdown } from '@/components/ui/dropdown'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'

const GYM_TYPES = [
  { value: 'crossfit' as const, label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox' as const, label: 'Hyrox', description: 'Race-format training with ski erg, sleds, and functional stations' },
]

const SECTIONS = [
  { id: 'gym-info', label: 'Gym Info' },
  { id: 'gym-type', label: 'Gym Type' },
  { id: 'booking', label: 'Booking' },
  { id: 'members', label: 'Members' },
  { id: 'notifications', label: 'Notifications' },
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
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${enabled ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function SavedIndicator({ show }: { show: boolean }) {
  return (
    <span className={`text-xs text-accent transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      ✓ Saved
    </span>
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
    load().catch(err => {
      console.error('[settings] load error', err)
      setLoadError('Failed to load settings. Please refresh.')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(body: Record<string, unknown>, setSaved: (v: boolean) => void) {
    const res = await fetch('/api/settings/gym', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
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

  if (loadError) return (
    <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger max-w-md">
      {loadError}
    </div>
  )
  if (!gym) return (
    <div>
      <div className="h-8 w-32 bg-foreground-10 rounded animate-pulse mb-10" />
      <div className="flex gap-12 max-w-3xl">
        <div className="w-36 shrink-0 hidden md:block space-y-2">
          {[80, 68, 56, 72, 90].map((w, i) => (
            <div key={i} className={`h-3 bg-foreground-10 rounded animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex-1 space-y-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <div className="h-4 w-24 bg-foreground-10 rounded animate-pulse" />
              <div className="h-10 bg-foreground-10 rounded animate-pulse" />
              <div className="h-10 bg-foreground-10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-10">Settings</h1>

      <div className="flex gap-12 max-w-3xl">

        {/* Left anchor nav */}
        <nav className="w-36 shrink-0 hidden md:block">
          <div className="sticky top-8 space-y-0.5">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className="block text-sm text-secondary hover:text-foreground py-1.5 transition-colors border-l-2 border-transparent hover:border-border pl-3">
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Gym Info */}
          <section id="gym-info">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Gym Info</h2>
              <SavedIndicator show={saved} />
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Gym Name</label>
                <input value={gym.name} onChange={e => setGym(g => g ? {...g, name: e.target.value} : g)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Timezone</label>
                <Dropdown
                  value={gym.timezone}
                  onChange={tz => setGym(g => g ? {...g, timezone: tz} : g)}
                  options={TIMEZONE_OPTIONS}
                />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Contact Email</label>
                <input
                  type="email"
                  value={gym.contact_email}
                  onChange={e => setGym(g => g ? {...g, contact_email: e.target.value} : g)}
                  placeholder="hello@yourgym.com"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-secondary text-xs mt-1.5">Used as reply-to on all outgoing emails.</p>
              </div>
              <button type="submit"
                className="px-4 py-2 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98]">
                Save Changes
              </button>
            </form>
          </section>

          <div className="border-t border-border" />

          {/* Gym Type */}
          <section id="gym-type">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Gym Type</h2>
              <SavedIndicator show={gymTypeSaved} />
            </div>
            <div className="space-y-2">
              {GYM_TYPES.map(({ value, label, description }) => (
                <label key={value} className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${gym.gym_type === value ? 'border-accent bg-accent-5' : 'border-border bg-background hover:border-border/80'}`}>
                  <input type="radio" name="gymType" value={value} checked={gym.gym_type === value}
                    onChange={() => {
                      setGym(g => g ? { ...g, gym_type: value } : g)
                      patch({ gymType: value }, setGymTypeSaved)
                    }}
                    className="mt-0.5 accent-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-secondary mt-0.5">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Booking Rules */}
          <section id="booking">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Booking</h2>
                <p className="text-xs text-secondary mt-0.5">Control how members can manage their bookings.</p>
              </div>
              <SavedIndicator show={cutoffSaved || bookingSaved} />
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Cancellation cutoff</label>
                <Dropdown
                  value={String(gym.cancellation_cutoff_hours)}
                  onChange={val => {
                    const num = Number(val)
                    setGym(g => g ? { ...g, cancellation_cutoff_hours: num } : g)
                    patch({ cancellationCutoffHours: num }, setCutoffSaved)
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
                <label className="text-xs text-secondary mb-1.5 block">Booking window</label>
                <Dropdown
                  value={String(gym.booking_advance_hours)}
                  onChange={val => {
                    const num = Number(val)
                    setGym(g => g ? { ...g, booking_advance_hours: num } : g)
                    patch({ bookingAdvanceHours: num }, setBookingSaved)
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
                <p className="text-secondary text-xs mt-1.5">How far in advance members can book a class.</p>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Default class capacity</label>
                <input
                  type="number" min={1} max={200} value={gym.default_capacity}
                  onChange={e => setGym(g => g ? { ...g, default_capacity: Number(e.target.value) } : g)}
                  onBlur={e => {
                    const val = Math.min(200, Math.max(1, Number(e.target.value)))
                    setGym(g => g ? { ...g, default_capacity: val } : g)
                    patch({ defaultCapacity: val }, setBookingSaved)
                  }}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-secondary text-xs mt-1.5">Used as the default when creating new class slots.</p>
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Members */}
          <section id="members">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Members</h2>
              <SavedIndicator show={membersSaved} />
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Enable waitlist</p>
                  <p className="text-secondary text-xs mt-0.5">When a class is full, members can join a waitlist.</p>
                </div>
                <Toggle
                  enabled={gym.waitlist_enabled}
                  onChange={val => {
                    setGym(g => g ? { ...g, waitlist_enabled: val } : g)
                    patch({ waitlistEnabled: val }, setMembersSaved)
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Show member names</p>
                  <p className="text-secondary text-xs mt-0.5">Members can see who else is booked into a class.</p>
                </div>
                <Toggle
                  enabled={gym.show_member_names}
                  onChange={val => {
                    setGym(g => g ? { ...g, show_member_names: val } : g)
                    patch({ showMemberNames: val }, setMembersSaved)
                  }}
                />
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Notifications */}
          <section id="notifications">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              <SavedIndicator show={notifySaved} />
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Workout published email</p>
                  <p className="text-secondary text-xs mt-0.5">Email members when a new week&apos;s workouts go live.</p>
                </div>
                <Toggle
                  enabled={gym.notify_workout_published}
                  onChange={val => {
                    setGym(g => g ? { ...g, notify_workout_published: val } : g)
                    patch({ notifyWorkoutPublished: val }, setNotifySaved)
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Booking confirmation email</p>
                  <p className="text-secondary text-xs mt-0.5">Email members when their booking is confirmed.</p>
                </div>
                <Toggle
                  enabled={gym.notify_booking_confirmed}
                  onChange={val => {
                    setGym(g => g ? { ...g, notify_booking_confirmed: val } : g)
                    patch({ notifyBookingConfirmed: val }, setNotifySaved)
                  }}
                />
              </div>
            </div>
          </section>

          <div className="pb-8" />
        </div>
      </div>
    </div>
  )
}
