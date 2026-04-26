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
  // timingSafeEqual requires same-length buffers
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  const match = a.length === b.length && crypto.timingSafeEqual(a, b)
  if (!match) {
    return jsonError('Unauthorized', 401)
  }
  return null
}
