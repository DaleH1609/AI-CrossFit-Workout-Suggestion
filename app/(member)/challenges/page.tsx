'use client'
import { useState, useEffect } from 'react'
import { Medal as MedalIcon } from '@phosphor-icons/react'

interface Challenge {
  id: string
  title: string
  description: string | null
  month: string
  type: string
  target: number | null
  isOptedIn: boolean
}

interface LeaderboardEntry {
  userId: string
  name: string
  score: number
  isMe: boolean
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function Medal({ rank }: { rank: number }) {
  // Rank conveyed by glyph + colour rather than emoji, so it renders
  // identically across platforms and inherits the type scale.
  if (rank === 1) return <MedalIcon size={18} weight="fill" className="text-accent" aria-label="First place" />
  if (rank === 2) return <MedalIcon size={18} weight="fill" className="text-secondary" aria-label="Second place" />
  if (rank === 3) return <MedalIcon size={18} weight="fill" className="text-warning" aria-label="Third place" />
  return <span className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-[10px] text-secondary font-bold inline-flex">{rank}</span>
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [toggling, setToggling] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/members/challenges')
    if (res.ok) {
      const { challenges: data } = await res.json()
      setChallenges(data ?? [])
    }
    setLoading(false)
  }

  async function loadLeaderboard(c: Challenge) {
    if (leaderboards[c.id]) return
    const res = await fetch(`/api/members/challenges?id=${c.id}&month=${c.month}`)
    if (res.ok) {
      const { leaderboard } = await res.json()
      setLeaderboards(prev => ({ ...prev, [c.id]: leaderboard ?? [] }))
    }
  }

  async function toggleOptIn(c: Challenge) {
    setToggling(c.id)
    await fetch('/api/members/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: c.id, optIn: !c.isOptedIn }),
    })
    await load()
    // Refresh leaderboard
    setLeaderboards(prev => { const n = { ...prev }; delete n[c.id]; return n })
    if (expanded === c.id) {
      const updated = await fetch(`/api/members/challenges?id=${c.id}&month=${c.month}`)
      if (updated.ok) {
        const { leaderboard } = await updated.json()
        setLeaderboards(prev => ({ ...prev, [c.id]: leaderboard ?? [] }))
      }
    }
    setToggling(null)
  }

  async function handleExpand(c: Challenge) {
    if (expanded === c.id) {
      setExpanded(null)
      return
    }
    setExpanded(c.id)
    await loadLeaderboard(c)
  }

  if (loading) return <div className="max-w-md"><p className="text-secondary text-sm">Loading…</p></div>

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl text-foreground mb-2">Challenges</h1>
      <p className="text-secondary text-sm mb-8">Monthly competitions for your gym. Opt in to compete.</p>

      {challenges.length === 0 ? (
        <div className="border border-border rounded-xl py-16 text-center">
          <p className="text-secondary text-sm">No active challenges right now.</p>
          <p className="text-secondary text-xs mt-1">Check back next month!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(c => {
            const board = leaderboards[c.id] ?? []
            const myRank = board.findIndex(e => e.isMe) + 1
            return (
              <div key={c.id} className="border border-border rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-secondary mb-1">{monthLabel(c.month)}</p>
                      <p className="font-medium text-foreground">{c.title}</p>
                      {c.description && <p className="text-xs text-secondary mt-0.5">{c.description}</p>}
                      <p className="text-xs text-secondary mt-1">
                        {c.type === 'classes' ? 'Most classes attended' : 'Longest streak'}
                        {c.target ? ` · Target: ${c.target}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleOptIn(c)}
                      disabled={toggling === c.id}
                      className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-btn border transition-colors disabled:opacity-50 ${
                        c.isOptedIn
                          ? 'bg-accent-5 border-accent-20 text-accent hover:bg-accent-10'
                          : 'bg-surface border-border text-secondary hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {c.isOptedIn ? 'Joined ✓' : 'Join'}
                    </button>
                  </div>

                  {c.isOptedIn && myRank > 0 && (
                    <p className="text-xs text-accent mt-3">
                      You&apos;re ranked #{myRank} with {board[myRank - 1]?.score ?? 0} {c.type === 'classes' ? 'classes' : 'day streak'}
                    </p>
                  )}

                  <button
                    onClick={() => handleExpand(c)}
                    className="mt-3 text-xs text-secondary hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {expanded === c.id ? 'Hide' : 'View'} leaderboard
                    <span className={`transition-transform ${expanded === c.id ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                </div>

                {expanded === c.id && (
                  <div className="border-t border-border bg-surface-raised">
                    {board.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-secondary">No participants yet. Be the first!</p>
                    ) : (
                      board.slice(0, 20).map((entry, idx) => (
                        <div
                          key={entry.userId}
                          className={`flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0 ${entry.isMe ? 'bg-accent-5' : ''}`}
                        >
                          <Medal rank={idx + 1} />
                          <span className={`flex-1 text-sm ${entry.isMe ? 'text-accent font-medium' : 'text-foreground'}`}>
                            {entry.isMe ? 'You' : entry.name}
                          </span>
                          <span className="text-sm text-secondary tabular-nums">
                            {entry.score} {c.type === 'classes' ? 'cls' : 'days'}
                          </span>
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
  )
}
