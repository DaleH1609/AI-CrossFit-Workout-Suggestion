export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBroadcast } from '@/lib/email/send'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || !['owner', 'admin'].includes(data.role ?? '')) return null
  return { gymId: data.gym_id as string }
}

// POST /api/admin/broadcast — send email to all active gym members
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { subject, bodyText, audience = 'active' } = body as {
    subject?: string
    bodyText?: string
    audience?: 'active' | 'all'
  }

  if (!subject?.trim()) return jsonError('subject is required')
  if (!bodyText?.trim()) return jsonError('body is required')

  // Simple length guards
  if (subject.length > 200) return jsonError('subject too long (max 200 chars)')
  if (bodyText.length > 10_000) return jsonError('body too long (max 10,000 chars)')

  try {
    const supabase = createAdminClient()

    // Fetch gym info for the from name and contact email
    const { data: gym } = await supabase
      .from('gyms')
      .select('name, contact_email')
      .eq('id', auth.gymId)
      .single()

    const gymName = (gym as { name: string; contact_email: string | null } | null)?.name ?? 'Your Gym'
    const contactEmail = (gym as { name: string; contact_email: string | null } | null)?.contact_email

    // Fetch members
    let query = supabase
      .from('users')
      .select('email, name')
      .eq('gym_id', auth.gymId)
      .eq('role', 'member')
      .not('email', 'is', null)

    if (audience === 'active') {
      query = query.is('revoked_at', null)
    }

    const { data: members, error } = await query
    if (error) throw error
    if (!members || members.length === 0) {
      return jsonOk({ sent: 0, failed: 0, message: 'No members to send to' })
    }

    // Convert plain text body to minimal safe HTML (newlines → <br>)
    const bodyHtml = bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    const result = await sendBroadcast(
      members as { email: string; name: string }[],
      subject,
      bodyHtml,
      gymName,
      contactEmail
    )

    return jsonOk({ ...result, total: members.length })
  } catch (err) {
    return jsonServerError('Failed to send broadcast', err)
  }
}
