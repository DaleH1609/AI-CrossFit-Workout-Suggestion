// app/api/push/send/route.ts
// Admin-triggered push to all gym members
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendPushToGym } from '@/lib/push/send'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const gymId = userData.gym_id

  let body: { title?: unknown; body?: unknown; url?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.title !== 'string' || !body.title.trim()) return jsonError('title required')
  if (typeof body.body !== 'string' || !body.body.trim()) return jsonError('body required')

  try {
    const stats = await sendPushToGym(gymId, {
      title: body.title.trim(),
      body: (body.body as string).trim(),
      url: typeof body.url === 'string' ? body.url : '/this-week',
    })
    return jsonOk(stats)
  } catch (err) {
    return jsonServerError('push/send', err)
  }
}
