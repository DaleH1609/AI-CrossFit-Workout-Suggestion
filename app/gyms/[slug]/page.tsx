// app/gyms/[slug]/page.tsx
// Public gym profile + WOD blog — no auth required
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Params { slug: string }

interface GymRow {
  id: string
  name: string
  tagline: string | null
  description: string | null
  website_url: string | null
  instagram_url: string | null
  timezone: string
}

interface WodPost {
  id: string
  title: string
  body: string
  workout_date: string | null
  created_at: string
}

export default async function PublicGymPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, tagline, description, website_url, instagram_url, timezone')
    .eq('slug', slug)
    .single()

  if (!gym) notFound()

  const g = gym as unknown as GymRow

  const { data: posts } = await supabase
    .from('wod_posts')
    .select('id, title, body, workout_date, created_at')
    .eq('gym_id', g.id)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  const wodPosts = (posts ?? []) as WodPost[]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-3">CrossFit Gym</p>
          <h1 className="font-display text-5xl text-foreground mb-4">{g.name}</h1>
          {g.tagline && <p className="text-xl text-secondary mb-6">{g.tagline}</p>}
          {g.description && (
            <p className="text-foreground/80 text-sm leading-relaxed max-w-xl">{g.description}</p>
          )}
          <div className="flex gap-4 mt-8">
            {g.website_url && (
              <a href={g.website_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-accent hover:underline">Website ↗</a>
            )}
            {g.instagram_url && (
              <a href={g.instagram_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-secondary hover:text-foreground transition-colors">Instagram ↗</a>
            )}
          </div>
        </div>
      </div>

      {/* WOD blog */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="font-display text-2xl text-foreground mb-8">Workouts</h2>

        {wodPosts.length === 0 ? (
          <p className="text-secondary italic text-sm">No workouts published yet.</p>
        ) : (
          <div className="space-y-10">
            {wodPosts.map(post => (
              <article key={post.id} className="border-b border-border pb-10 last:border-0">
                <div className="flex items-baseline gap-3 mb-3">
                  <p className="text-secondary text-xs uppercase tracking-wider">
                    {post.workout_date
                      ? new Date(post.workout_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      : new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <h3 className="font-display text-xl text-foreground mb-3">{post.title}</h3>
                <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{post.body}</pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
