// lib/crypto/token.ts
//
// HMAC-SHA256 signed booking confirmation tokens.
//
// Why: the previous scheme used a random UUID stored in a DB column,
// looked up by equality. That means anyone who can guess or intercept a UUID
// (log scraping, email forwarding, referer leaks) owns the confirmation.
// A signed token lets us verify integrity without a DB lookup; tampered
// tokens fail early with a generic error. The DB column was dropped in
// migration 019_drop_confirmation_token.sql.
//
// Format: `v1.{base64url(payload)}.{base64url(signature)}`
// where payload is JSON { b: bookingId, e: expiresAtMs }.
//
// The BOOKING_TOKEN_SECRET env var must be set in all environments that
// generate or verify tokens. The secret should be rotated by issuing new
// tokens; old pending_confirmation rows with the prior secret will simply
// fail verification and be swept by the waitlist-expire cron.

import { createHmac, timingSafeEqual } from 'crypto'

const VERSION = 'v1'

function getSecret(): string {
  const secret = process.env.BOOKING_TOKEN_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('BOOKING_TOKEN_SECRET must be set and at least 16 chars')
  }
  return secret
}

function base64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Buffer {
  // Pad back to a multiple of 4
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64')
}

function sign(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return base64urlEncode(hmac.digest())
}

export interface TokenPayload {
  bookingId: string
  expiresAtMs: number
}

/** Produces a tamper-evident token for a booking confirmation. */
export function signToken(bookingId: string, expiresAtMs: number): string {
  const secret = getSecret()
  const payload = JSON.stringify({ b: bookingId, e: expiresAtMs })
  const encoded = base64urlEncode(payload)
  const sig = sign(`${VERSION}.${encoded}`, secret)
  return `${VERSION}.${encoded}.${sig}`
}

/**
 * Verifies a token. Returns the payload on success, null on any failure
 * (malformed, wrong signature, expired). Callers should treat null the same
 * way: generic "link invalid or expired" response.
 */
export function verifyToken(token: string): TokenPayload | null {
  if (typeof token !== 'string') return null

  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [version, encoded, sig] = parts
  if (version !== VERSION) return null

  const expectedSig = sign(`${version}.${encoded}`, secret)

  // Timing-safe compare. Different lengths = definitely invalid.
  const sigBuf = Buffer.from(sig, 'utf8')
  const expectedBuf = Buffer.from(expectedSig, 'utf8')
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  let payload: { b?: unknown; e?: unknown }
  try {
    payload = JSON.parse(base64urlDecode(encoded).toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload.b !== 'string' || typeof payload.e !== 'number') return null
  if (payload.e < Date.now()) return null

  return { bookingId: payload.b, expiresAtMs: payload.e }
}
