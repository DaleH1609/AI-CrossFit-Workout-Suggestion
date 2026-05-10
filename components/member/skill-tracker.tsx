'use client'
import { useState, useEffect } from 'react'

interface Skill {
  id: string
  name: string
  category: string
  level: 'none' | 'learning' | 'rx' | 'advanced'
  notes: string | null
}

const LEVELS = [
  { value: 'none',     label: 'Not Started', className: 'text-secondary' },
  { value: 'learning', label: 'Learning',     className: 'text-warning' },
  { value: 'rx',       label: 'Rx',           className: 'text-accent' },
  { value: 'advanced', label: 'Advanced',     className: 'text-success' },
]

const LEVEL_ORDER = ['none', 'learning', 'rx', 'advanced'] as const

function LevelBadge({ level }: { level: string }) {
  const l = LEVELS.find(x => x.value === level) ?? LEVELS[0]
  return <span className={`text-xs font-semibold ${l.className}`}>{l.label}</span>
}

export function SkillTracker() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    fetch('/api/members/skills')
      .then(r => r.json())
      .then(d => { setSkills(d); setLoading(false) })
  }, [])

  const categories = ['all', ...Array.from(new Set(skills.map(s => s.category))).sort()]
  const filtered = skills.filter(s => activeCategory === 'all' || s.category === activeCategory)

  async function cycleLevel(skill: Skill) {
    const idx = LEVEL_ORDER.indexOf(skill.level)
    const next = LEVEL_ORDER[(idx + 1) % LEVEL_ORDER.length]
    setSaving(skill.id)
    setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, level: next } : s))
    await fetch('/api/members/skills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: skill.id, level: next }),
    })
    setSaving(null)
  }

  const rxCount = skills.filter(s => s.level === 'rx' || s.level === 'advanced').length
  const learningCount = skills.filter(s => s.level === 'learning').length

  if (loading) return <p className="text-secondary text-sm">Loading skills…</p>

  return (
    <div>
      <div className="flex gap-6 mb-5">
        <div>
          <p className="font-display text-xl text-accent">{rxCount}</p>
          <p className="text-secondary text-[10px] uppercase tracking-wider">Rx+</p>
        </div>
        <div>
          <p className="font-display text-xl text-warning">{learningCount}</p>
          <p className="text-secondary text-[10px] uppercase tracking-wider">Learning</p>
        </div>
        <div>
          <p className="font-display text-xl text-foreground">{skills.length}</p>
          <p className="text-secondary text-[10px] uppercase tracking-wider">Total Skills</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              activeCategory === cat
                ? 'bg-accent-15 text-accent border border-accent-40'
                : 'bg-surface text-secondary border border-border hover:border-accent-30'
            }`}
          >{cat}</button>
        ))}
      </div>

      <div className="space-y-0">
        {filtered.map(skill => (
          <div key={skill.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <span className="text-sm text-foreground">{skill.name}</span>
            <button onClick={() => cycleLevel(skill)} disabled={saving === skill.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface transition-colors disabled:opacity-50"
              title="Click to cycle level"
            >
              <LevelBadge level={skill.level} />
              <span className="text-secondary text-xs">↻</span>
            </button>
          </div>
        ))}
      </div>

      <p className="text-secondary text-xs mt-3">Tap a skill to cycle: Not Started → Learning → Rx → Advanced</p>
    </div>
  )
}
