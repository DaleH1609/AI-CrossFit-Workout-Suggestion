// lib/checkin.ts
// Time-based check-in codes for class attendance (F19)
// Code rotates every 30 minutes and is tied to a specific class instance.
// HMAC-based so it can't be guessed without the secret.

import { createHmac } from 'crypto'

const WINDOW_MS = 30 * 60 * 1000 // 30 minutes

function getSecret(): string {
  const s = process.env.BOOKING_TOKEN_SECRET
  if (!s) throw new Error('BOOKING_TOKEN_SECRET not configured')
  return s
}

function timeSlot(now = Date.now()) {
  return Math.floor(now / WINDOW_MS)
}

/** Generate a 6-digit check-in code for a given instance and the current time window. */
export function generateCheckinCode(instanceId: string, now = Date.now()): string {
  const slot = timeSlot(now)
  const mac = createHmac('sha256', getSecret())
    .update(`checkin:${instanceId}:${slot}`)
    .digest('hex')
  // Take first 6 decimal digits from the hex digest
  const num = parseInt(mac.slice(0, 8), 16) % 1_000_000
  return String(num).padStart(6, '0')
}

/**
 * Verify a check-in code. Accepts both the current and previous time window
 * to handle the case where a member enters just as the code rotates.
 */
export function verifyCheckinCode(instanceId: string, code: string): boolean {
  const now = Date.now()
  const current = generateCheckinCode(instanceId, now)
  const previous = generateCheckinCode(instanceId, now - WINDOW_MS)
  return code === current || code === previous
}
