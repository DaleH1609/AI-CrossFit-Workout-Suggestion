'use client'
import { useState } from 'react'

interface ClassFeedbackProps {
  instanceId: string
  classTime: string  // display string like "6:00 AM"
}

const STAR_LABELS = ['', 'Tough day', 'Decent', 'Good', 'Great', 'Loved it!']

export function ClassFeedback({ instanceId, classTime }: ClassFeedbackProps) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  if (submitted) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-secondary">
        <span className="text-accent">★</span>
        <span>Thanks for the feedback!</span>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-secondary hover:text-foreground transition-colors flex items-center gap-1"
      >
        <span className="text-accent opacity-60">★</span> Rate this class
      </button>
    )
  }

  async function handleSubmit() {
    if (!rating) return
    setSaving(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, rating, comment }),
    })
    setSaving(false)
    setSubmitted(true)
  }

  const displayStar = hover || rating

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-secondary mb-2">How was {classTime}?</p>

      {/* Stars */}
      <div className="flex gap-1 mb-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className={`text-xl transition-colors ${n <= displayStar ? 'text-accent' : 'text-border'}`}
          >
            ★
          </button>
        ))}
      </div>
      {displayStar > 0 && (
        <p className="text-xs text-accent mb-2">{STAR_LABELS[displayStar]}</p>
      )}

      {/* Optional comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Any comments? (optional)"
        rows={2}
        className="w-full px-2.5 py-2 bg-background border border-border rounded text-xs text-foreground placeholder-secondary resize-none focus:outline-none focus:border-accent transition-colors"
      />

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSubmit}
          disabled={!rating || saving}
          className="px-3 py-1.5 bg-accent text-on-accent text-xs font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-secondary hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
