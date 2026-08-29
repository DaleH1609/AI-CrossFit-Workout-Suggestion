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
  { id: 'displays', label: 'Displays' },
  { id: 'public-page', label: 'Public Page' },
  { id: 'broadcast', label: 'Broadcast Email' },
  { id: 'integrations', label: 'Integrations' },
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
  const [whiteboardToken, setWhiteboardToken] = useState<string | null>(null)
  const [whiteboardCopied, setWhiteboardCopied] = useState(false)
  const [gymSlug, setGymSlug] = useState('')
  const [slugSaved, setSlugSaved] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [gymTagline, setGymTagline] = useState('')
  const [gymDescription, setGymDescription] = useState('')
  const [gymWebsite, setGymWebsite] = useState('')
  const [gymInstagram, setGymInstagram] = useState('')
  const [publicProfileSaved, setPublicProfileSaved] = useState(false)
  const [broadcast, setBroadcast] = useState({ subject: '', body: '', audience: 'active' as 'active' | 'all' })
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [broadcastError, setBroadcastError] = useState('')
  const [webhooks, setWebhooks] = useState<{ id: string; platform: string; url: string; label: string; events: string[] }[]>([])
  const [webhookForm, setWebhookForm] = useState({ platform: 'slack', url: '', label: '', events: ['workout_published'] })
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookError, setWebhookError] = useState('')
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
        .select('name, timezone, gym_type, cancellation_cutoff_hours, default_capacity, waitlist_enabled, booking_advance_hours, show_member_names, notify_workout_published, notify_booking_confirmed, contact_email, whiteboard_token, slug, tagline, description, website_url, instagram_url')
        .eq('id', gymUser.gym_id).single()
      if (error) { setLoadError(error.message); return }
      if (data) {
        const raw = data as unknown as Partial<GymSettings> & { whiteboard_token?: string; slug?: string; tagline?: string | null; description?: string | null; website_url?: string | null; instagram_url?: string | null }
        setWhiteboardToken(raw.whiteboard_token ?? null)
        setGymSlug(raw.slug ?? '')
        setGymTagline(raw.tagline ?? '')
        setGymDescription(raw.description ?? '')
        setGymWebsite(raw.website_url ?? '')
        setGymInstagram(raw.instagram_url ?? '')
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
    fetch('/api/settings/webhooks').then(r => r.ok ? r.json() : []).then(setWebhooks).catch(() => {})
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
              <h2 className="text-sm font-semibold text-foreground">Gym info</h2>
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
              <h2 className="text-sm font-semibold text-foreground">Gym type</h2>
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
                    { value: '0', label: 'No limit - members can cancel any time' },
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
                    { value: '0', label: 'Always open - book any time' },
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

          <div className="border-t border-border" />

          {/* Displays */}
          <section id="displays">
            <h2 className="text-sm font-semibold text-foreground mb-5">Displays</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground mb-1">Whiteboard / TV Mode</p>
                <p className="text-secondary text-xs mb-3">
                  Open this URL on a wall-mounted display. Shows today&apos;s workout, class roster, and check-ins. Auto-refreshes every minute.
                </p>
                {whiteboardToken ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 text-secondary font-mono overflow-x-auto whitespace-nowrap">
                      {typeof window !== 'undefined' ? `${window.location.origin}/whiteboard/${whiteboardToken}` : `/whiteboard/${whiteboardToken}`}
                    </code>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/whiteboard/${whiteboardToken}`)
                          setWhiteboardCopied(true)
                          setTimeout(() => setWhiteboardCopied(false), 2000)
                        }
                      }}
                      className="px-3 py-2 text-xs border border-border rounded-btn text-secondary hover:text-foreground hover:border-foreground/30 transition-colors whitespace-nowrap"
                    >
                      {whiteboardCopied ? '✓ Copied' : 'Copy'}
                    </button>
                    <a
                      href={`/whiteboard/${whiteboardToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-xs bg-accent text-background rounded-btn hover:bg-accent-90 transition-colors whitespace-nowrap font-semibold"
                    >
                      Open ↗
                    </a>
                  </div>
                ) : (
                  <p className="text-secondary text-xs">Loading…</p>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Public Page */}
          <section id="public-page">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Public page</h2>
              <SavedIndicator show={slugSaved} />
            </div>
            <p className="text-secondary text-xs mb-4">
              Give your gym a public URL for your WOD blog and gym info. Share it with prospects and the broader community.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-secondary whitespace-nowrap">/gym/</span>
              <input
                value={gymSlug}
                onChange={e => { setGymSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugError('') }}
                placeholder="my-crossfit-gym"
                className="flex-1 px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors font-mono"
              />
              <button
                onClick={async () => {
                  setSlugError('')
                  if (!gymSlug.trim()) { setSlugError('Slug cannot be empty'); return }
                  const res = await fetch('/api/settings/gym', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: gymSlug.trim() }),
                  })
                  if (!res.ok) {
                    const d = await res.json().catch(() => ({}))
                    setSlugError(d.error ?? 'Failed to save slug (it may already be taken)')
                  } else {
                    setSlugSaved(true); setTimeout(() => setSlugSaved(false), 2000)
                  }
                }}
                className="px-4 py-2.5 bg-accent text-background text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors whitespace-nowrap"
              >
                Save
              </button>
            </div>
            {slugError && <p className="text-danger text-xs mt-1">{slugError}</p>}
            {gymSlug && (
              <div className="flex items-center gap-3 mt-3">
                <a href={`/gym/${gymSlug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline">
                  View public page ↗
                </a>
                <a href="/wod-blog" className="text-xs text-secondary hover:text-foreground transition-colors">
                  Manage WOD posts →
                </a>
              </div>
            )}

            {/* Public profile details */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Profile Details</p>
                <SavedIndicator show={publicProfileSaved} />
              </div>
              <input
                value={gymTagline}
                onChange={e => setGymTagline(e.target.value)}
                placeholder="Tagline (e.g. 'Forging elite fitness since 2018')"
                maxLength={200}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <textarea
                value={gymDescription}
                onChange={e => setGymDescription(e.target.value)}
                placeholder="Description - tell the public about your gym, community, and approach."
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <input
                value={gymWebsite}
                onChange={e => setGymWebsite(e.target.value)}
                placeholder="Website URL (https://…)"
                type="url"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <input
                value={gymInstagram}
                onChange={e => setGymInstagram(e.target.value)}
                placeholder="Instagram URL (https://instagram.com/…)"
                type="url"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={async () => {
                  const res = await fetch('/api/settings/gym', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tagline: gymTagline,
                      description: gymDescription,
                      websiteUrl: gymWebsite,
                      instagramUrl: gymInstagram,
                    }),
                  })
                  if (res.ok) { setPublicProfileSaved(true); setTimeout(() => setPublicProfileSaved(false), 2000) }
                }}
                className="px-4 py-2 bg-accent text-background text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Broadcast email */}
          <section id="broadcast">
            <h2 className="text-sm font-semibold text-foreground mb-1">Broadcast email</h2>
            <p className="text-secondary text-xs mb-5">Send a one-off email to all active members - announcements, schedule changes, special events.</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={broadcast.audience}
                  onChange={e => setBroadcast(f => ({ ...f, audience: e.target.value as 'active' | 'all' }))}
                  className="px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="active">Active members only</option>
                  <option value="all">All members (incl. revoked)</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Subject line…"
                value={broadcast.subject}
                onChange={e => setBroadcast(f => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <textarea
                placeholder="Message body…"
                rows={5}
                value={broadcast.body}
                onChange={e => setBroadcast(f => ({ ...f, body: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors resize-y"
              />
              {broadcastError && <p className="text-danger text-xs">{broadcastError}</p>}
              {broadcastResult && (
                <p className="text-xs text-accent">
                  Sent to {broadcastResult.sent}/{broadcastResult.total} members
                  {broadcastResult.failed > 0 ? ` (${broadcastResult.failed} failed)` : ''}
                </p>
              )}
              <button
                disabled={broadcastSending || !broadcast.subject.trim() || !broadcast.body.trim()}
                onClick={async () => {
                  setBroadcastError('')
                  setBroadcastResult(null)
                  setBroadcastSending(true)
                  const res = await fetch('/api/admin/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: broadcast.subject, bodyText: broadcast.body, audience: broadcast.audience }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) { setBroadcastError(data.error ?? 'Failed to send'); }
                  else { setBroadcastResult(data); setBroadcast(f => ({ ...f, subject: '', body: '' })) }
                  setBroadcastSending(false)
                }}
                className="px-4 py-2 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                {broadcastSending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Integrations - Slack/Discord webhooks */}
          <section id="integrations">
            <h2 className="text-sm font-semibold text-foreground mb-2">Integrations</h2>
            <p className="text-secondary text-xs mb-5">Send automatic notifications to Slack or Discord when events happen in your gym.</p>

            {/* Add webhook form */}
            <div className="rounded-lg border border-border bg-surface p-4 mb-4">
              <p className="text-xs font-semibold text-foreground mb-3">Add Webhook</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select value={webhookForm.platform}
                    onChange={e => setWebhookForm(f => ({ ...f, platform: e.target.value }))}
                    className="px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent">
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://hooks.slack.com/…"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors" />
                </div>
                <input value={webhookForm.label} onChange={e => setWebhookForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Label (optional)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors" />
                <div className="flex flex-wrap gap-2">
                  {['workout_published', 'booking_confirmed', 'booking_cancelled', 'new_member'].map(ev => (
                    <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox"
                        checked={webhookForm.events.includes(ev)}
                        onChange={e => setWebhookForm(f => ({
                          ...f,
                          events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev),
                        }))}
                        className="accent-accent"
                      />
                      <span className="text-xs text-secondary capitalize">{ev.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
                {webhookError && <p className="text-danger text-xs">{webhookError}</p>}
                <button
                  onClick={async () => {
                    setWebhookError('')
                    setWebhookSaving(true)
                    const res = await fetch('/api/settings/webhooks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(webhookForm),
                    })
                    if (res.ok) {
                      const w = await res.json()
                      setWebhooks(prev => [...prev, w])
                      setWebhookForm({ platform: 'slack', url: '', label: '', events: ['workout_published'] })
                    } else {
                      const d = await res.json().catch(() => ({}))
                      setWebhookError(d.error ?? 'Failed to add webhook')
                    }
                    setWebhookSaving(false)
                  }}
                  disabled={webhookSaving || !webhookForm.url || webhookForm.events.length === 0}
                  className="px-4 py-2 bg-accent text-background text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
                >
                  {webhookSaving ? 'Adding…' : 'Add Webhook'}
                </button>
              </div>
            </div>

            {/* Existing webhooks */}
            {webhooks.length > 0 && (
              <div className="space-y-2">
                {webhooks.map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 group">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground capitalize">{w.platform}{w.label ? ` - ${w.label}` : ''}</p>
                      <p className="text-xs text-secondary truncate">{w.url}</p>
                      <p className="text-xs text-secondary mt-0.5">{w.events.map(e => e.replace(/_/g, ' ')).join(', ')}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await fetch(`/api/settings/webhooks?id=${w.id}`, { method: 'DELETE' })
                        setWebhooks(prev => prev.filter(x => x.id !== w.id))
                      }}
                      className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-4 hover:underline"
                    >Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="pb-8" />
        </div>
      </div>
    </div>
  )
}
