'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkillTracker } from '@/components/member/skill-tracker'
import { MemberBadges } from '@/components/member/badges'
import { PushSubscribeButton } from '@/components/push/push-subscribe-button'
import { Measurements } from '@/components/member/measurements'
import { YearInReview } from '@/components/member/year-in-review'

interface AttendanceStats {
  total: number
  current: number
  longest: number
  joinedAt: string | null
}

interface ProfileData {
  name: string
  waiver_signed_at: string | null
  photo_consent: boolean
}

function SavedBadge({ show }: { show: boolean }) {
  return (
    <span className={`text-xs text-accent transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      ✓ Saved
    </span>
  )
}

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  const [password, setPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [waiverSignedAt, setWaiverSignedAt] = useState<string | null>(null)
  const [photoConsent, setPhotoConsent] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('name, waiver_signed_at, photo_consent').eq('id', user.id).single()
      if (data) {
        const row = data as unknown as ProfileData
        setName(row.name ?? '')
        setWaiverSignedAt(row.waiver_signed_at)
        setPhotoConsent(row.photo_consent ?? false)
      }
    }
    async function loadStats() {
      const res = await fetch('/api/members/stats')
      if (res.ok) setStats(await res.json() as AttendanceStats)
    }
    loadProfile()
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('users').update({ name }).eq('id', user.id)
    if (error) { setNameError(error.message); return }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setPasswordError(error.message); return }
    setPassword('')
    setPasswordSaved(true)
    setShowPasswordForm(false)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl text-foreground mb-8">Profile</h1>

      {/* Avatar + name header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-accent-10 border border-accent-20 flex items-center justify-center shrink-0">
          <span className="font-display text-xl text-accent leading-none">
            {name ? name[0].toUpperCase() : '?'}
          </span>
        </div>
        <div>
          <p className="font-display text-xl text-foreground leading-tight">{name || 'Your Profile'}</p>
          <p className="text-secondary text-xs mt-0.5 uppercase tracking-wider">
            {stats?.joinedAt
              ? `Member since ${new Date(stats.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
              : 'Member'}
          </p>
        </div>
      </div>

      {/* Attendance stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total Classes', value: stats?.total ?? '—' },
          { label: 'Current Streak', value: stats?.current != null ? `${stats.current}d` : '—' },
          { label: 'Longest Streak', value: stats?.longest != null ? `${stats.longest}d` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-3 text-center">
            <p className="font-display text-2xl text-foreground">{value}</p>
            <p className="text-secondary text-[10px] mt-0.5 uppercase tracking-wider leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Name section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Your Name</h2>
          <SavedBadge show={nameSaved} />
        </div>
        <form onSubmit={handleSaveName} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
          />
          {nameError && (
            <div className="px-4 py-3 rounded-lg border border-danger/20 bg-danger/5 text-sm text-danger">
              {nameError}
            </div>
          )}
          <button type="submit"
            className="px-4 py-2 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98]">
            Save Name
          </button>
        </form>
      </section>

      <div className="border-t border-border" />

      {/* Photo consent */}
      <section className="pt-7">
        <h2 className="text-sm font-semibold text-foreground mb-3">Privacy</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground">Photo & video consent</p>
            <p className="text-secondary text-xs mt-0.5">Allow your gym to use photos/videos of you for marketing.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !photoConsent
              setConsentSaving(true)
              await fetch('/api/members/waiver', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo_consent: next }),
              })
              setPhotoConsent(next)
              setConsentSaving(false)
            }}
            disabled={consentSaving}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 ${photoConsent ? 'bg-accent' : 'bg-border'}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${photoConsent ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {waiverSignedAt && (
          <p className="text-secondary text-xs mt-4">
            Liability waiver accepted on {new Date(waiverSignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Badges + referrals */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-4">Achievements</h2>
        <MemberBadges />
      </section>

      <div className="border-t border-border" />

      {/* Skill tracker */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-4">My Skills</h2>
        <SkillTracker />
      </section>

      <div className="border-t border-border" />

      {/* Body measurements */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-4">Body Measurements</h2>
        <Measurements />
      </section>

      <div className="border-t border-border" />

      {/* Year in review */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-4">Year in Review</h2>
        <YearInReview />
      </section>

      <div className="border-t border-border" />

      {/* Notifications */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-1">Notifications</h2>
        <p className="text-xs text-secondary mb-3">Get alerts when new workouts are published or your class spot opens.</p>
        <PushSubscribeButton />
      </section>

      <div className="border-t border-border" />

      {/* Data export */}
      <section className="pt-7 pb-7">
        <h2 className="text-sm font-semibold text-foreground mb-1">Your Data</h2>
        <p className="text-xs text-secondary mb-3">Download a copy of all your personal data stored in KOVA.</p>
        <a
          href="/api/members/export"
          download
          className="text-sm text-secondary hover:text-foreground transition-colors flex items-center gap-1.5 group"
        >
          Download my data (JSON)
          <span className="group-hover:translate-x-0.5 transition-transform text-secondary">↓</span>
        </a>
      </section>

      <div className="border-t border-border" />

      {/* Password section — collapsible */}
      <section className="pt-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Password</h2>
          <SavedBadge show={passwordSaved} />
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="text-sm text-secondary hover:text-foreground transition-colors flex items-center gap-1.5 group"
          >
            Change password
            <span className="group-hover:translate-x-0.5 transition-transform text-secondary">→</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              minLength={8}
              required
              autoFocus
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
            />
            {passwordError && (
              <div className="px-4 py-3 rounded-lg border border-danger/20 bg-danger/5 text-sm text-danger">
                {passwordError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button type="submit"
                className="px-4 py-2 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98]">
                Update Password
              </button>
              <button type="button" onClick={() => { setShowPasswordForm(false); setPassword(''); setPasswordError('') }}
                className="text-sm text-secondary hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
