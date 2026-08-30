'use client'
import { useState, useEffect } from 'react'

interface WodPost {
  id: string
  title: string
  body: string
  workout_date: string | null
  published: boolean
  created_at: string
}

export default function WodBlogPage() {
  const [posts, setPosts] = useState<WodPost[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [workoutDate, setWorkoutDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/wod-posts')
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/wod-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, bodyText: body, workoutDate: workoutDate || null, published: true }),
    })
    if (res.ok) {
      setTitle(''); setBody(''); setWorkoutDate(''); setCreating(false)
      await load()
    }
    setSaving(false)
  }

  async function togglePublish(post: WodPost) {
    await fetch(`/api/wod-posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !post.published }),
    })
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: !p.published } : p))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/wod-posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)]">WOD Blog</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 bg-accent text-on-accent text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors"
        >
          {creating ? 'Cancel' : '+ New Post'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">New WOD Post</h2>
          <div>
            <label className="text-xs text-secondary mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Tuesday WOD - Fran"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="text-xs text-secondary mb-1 block">Workout Date (optional)</label>
            <input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="text-xs text-secondary mb-1 block">Workout Description</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} required rows={8}
              placeholder="21-15-9&#10;Thrusters (95/65 lb)&#10;Pull-ups&#10;&#10;Time cap: 15 minutes"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors resize-y font-mono" />
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-accent text-on-accent text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
            {saving ? 'Publishing…' : 'Publish Post'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-secondary text-sm">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="border border-border rounded-xl py-16 text-center">
          <p className="text-secondary text-sm">No posts yet. Create your first WOD post above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-foreground leading-tight truncate">{post.title}</h3>
                  <p className="text-secondary text-xs mt-0.5">
                    {post.workout_date
                      ? new Date(post.workout_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                      : new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(post)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      post.published
                        ? 'bg-accent-5 border-accent-20 text-accent'
                        : 'bg-surface border-border text-secondary'
                    }`}>
                    {post.published ? 'Published' : 'Draft'}
                  </button>
                  <button onClick={() => handleDelete(post.id)}
                    className="text-danger text-xs hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <pre className="mt-3 text-sm text-foreground/70 whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
                {post.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
