// lib/api/cron-auth.ts
//
// Shared guard for `/api/cron/*` handlers.
//
// Two failure modes we want to distinguish:
//   1. Caller used the wrong bearer → 401 (normal auth rejection).
//   2. The server forgot to set `CRON_SECRET` → 500 + loud log. Otherwise a
//      missing env var would silently turn the string comparison into
//      `"Bearer xxx" !== "Bearer undefined"` and every cron call would look
//      like a failed-auth 401, hiding the real misconfig.
//
// Usage:
//   const reject = assertCronAuth(req)
//   if (reject) return reject
//   // authorised

import crypto from 'crypto'
import { jsonError, jsonServerError } from '@/lib/api/response'
import type { NextResponse } from 'next/server'

export function assertCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return jsonServerError(
      'cron-auth',
      new Error('CRON_SECRET is not configured'),
    )
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  // HMAC both values with the secret as key so outputs are always 32 bytes —
  // makes the comparison constant-time regardless of input length, preventing
  // the 1-bit timing leak from the length short-circuit.
  const key = Buffer.from(secret)
  const ha = crypto.createHmac('sha256', key).update(authHeader).digest()
  const hb = crypto.createHmac('sha256', key).update(expected).digest()
  const match = crypto.timingSafeEqual(ha, hb)
  if (!match) {
    return jsonError('Unauthorized', 401)
  }
  return null
}
