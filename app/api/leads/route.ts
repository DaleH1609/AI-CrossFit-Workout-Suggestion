// app/api/leads/route.ts
// Public POST — capture a lead from any website form (no auth required)
// Requires ?gymId= query param so the form knows which gym to attribute the lead to.
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { sendLeadWelcome, sendLeadOwnerAlert } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const gymId = searchParams.get('gymId')
  if (!gymId) return jsonError('gymId required')

  let body: { email?: unknown; name?: unknown; phone?: unknown; source?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return jsonError('Valid email required')
  }

  const supabase = await createClient()

  // Verify gym exists and fetch name + contact_email for notification
  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, contact_email')
    .eq('id', gymId)
    .single()
  if (!gym) return jsonError('Gym not found', 404)

  const g = gym as { id: string; name: string; contact_email: string | null }
  const leadEmail = body.email.toLowerCase().trim()
  const leadName = typeof body.name === 'string' ? body.name.trim() || null : null

  const { error, data: inserted } = await supabase.from('leads').upsert({
    gym_id: gymId,
    email: leadEmail,
    name: leadName,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    source: typeof body.source === 'string' ? body.source.trim() || 'website' : 'website',
    status: 'new',
  }, { onConflict: 'gym_id,email', ignoreDuplicates: true }).select('id').single()

  if (error) return jsonServerError('leads POST', error)

  // Fire-and-forget: send welcome to lead + alert to gym owner
  // Only send on actual insert (ignoreDuplicates means data is null when skipped)
  if (inserted) {
    const emailsToSend: Promise<void>[] = [
      sendLeadWelcome(leadEmail, leadName, g.name, g.contact_email).catch(() => {}),
    ]
    // Notify gym's contact email if set
    if (g.contact_email) {
      emailsToSend.push(
        sendLeadOwnerAlert(g.contact_email, leadName, leadEmail, g.name).catch(() => {})
      )
    }
    await Promise.all(emailsToSend)
  }

  return jsonOk({ captured: true })
}
