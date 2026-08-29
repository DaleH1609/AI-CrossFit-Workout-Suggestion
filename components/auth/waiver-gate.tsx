'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const WAIVER_TEXT = `KOVA GYM - LIABILITY WAIVER AND ASSUMPTION OF RISK

By signing this waiver, I acknowledge and agree that:

1. Physical Activity Risk. I understand that participation in CrossFit and fitness activities involves inherent risks of injury, including but not limited to muscle strains, sprains, fractures, and in rare cases, death.

2. Medical Clearance. I confirm I am in good physical health and have obtained or waived medical clearance to participate in vigorous physical activity.

3. Assumption of Risk. I voluntarily assume all risks associated with participation in any classes, programs, or activities offered by this gym, whether caused by negligence or otherwise.

4. Release of Liability. I release, hold harmless, and discharge this gym, its owners, coaches, employees, and affiliates from any and all liability, claims, demands, or causes of action arising from my participation.

5. Emergency Contact. I consent to emergency medical treatment in the event I am incapacitated and unable to give consent.

6. Photography & Media. Participation may be photographed or recorded for marketing purposes unless I opt out in my profile settings.

This waiver is legally binding. By clicking "I Agree," I confirm I have read, understood, and voluntarily agree to all terms above.`

interface WaiverGateProps {
  children: React.ReactNode
}

export function WaiverGate({ children }: WaiverGateProps) {
  const [waiverSigned, setWaiverSigned] = useState<boolean | null>(null)
  const [signing, setSigning] = useState(false)
  const [photoConsent, setPhotoConsent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setWaiverSigned(true); return } // not logged in, not our problem
      const { data } = await supabase.from('users')
        .select('waiver_signed_at')
        .eq('id', user.id)
        .single()
      const signed = !!(data as unknown as { waiver_signed_at: string | null } | null)?.waiver_signed_at
      setWaiverSigned(signed)
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSign() {
    setSigning(true)
    await fetch('/api/members/waiver', { method: 'POST' })
    if (photoConsent) {
      await fetch('/api/members/waiver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_consent: true }),
      })
    }
    setWaiverSigned(true)
    setSigning(false)
  }

  if (waiverSigned === null) return null // loading
  if (waiverSigned) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-2">Before you get started</p>
          <h1 className="font-display text-3xl text-foreground mb-2">Liability Waiver</h1>
          <p className="text-secondary text-sm">Please read and accept before accessing your account.</p>
        </div>

        <div className="rounded-lg border border-border bg-surface mb-6 p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-secondary whitespace-pre-wrap font-sans leading-relaxed">
            {WAIVER_TEXT}
          </pre>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={e => setPhotoConsent(e.target.checked)}
              className="mt-0.5 accent-accent"
            />
            <span className="text-sm text-foreground/80">
              I consent to being photographed or recorded during classes for gym marketing purposes.
              <span className="text-secondary"> (Optional - you can change this in Profile settings.)</span>
            </span>
          </label>
        </div>

        <button
          onClick={handleSign}
          disabled={signing}
          className="w-full py-3 bg-accent text-background font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
        >
          {signing ? 'Recording signature…' : 'I Agree - Enter KOVA'}
        </button>

        <p className="text-center text-secondary text-xs mt-4">
          Your acceptance is recorded with a timestamp. You can view it in your profile.
        </p>
      </div>
    </div>
  )
}
