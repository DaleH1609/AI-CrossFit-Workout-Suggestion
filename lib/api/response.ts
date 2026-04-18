// lib/api/response.ts
//
// Shared helpers so every route handler returns a consistent shape.
// Closes the "inconsistent envelopes" and "error message leaking" findings
// from the API-contract review.

import { NextResponse } from 'next/server'
import type { Validator, Result } from '@/lib/validation/z'

/**
 * Success response.
 *
 * Passes the caller's shape through unchanged (no envelope wrapping). We kept
 * the pre-existing per-route response shapes (`{ booking }`, `{ templates }`,
 * `{ instances }`, etc.) so that every frontend caller continues to work.
 * Going through this helper instead of `NextResponse.json` directly gives us a
 * single seam for adding headers, logging, or an envelope migration later.
 */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

/** User-facing error: `{ error: string }` with a status code. */
export function jsonError(message: string, status = 400, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { ...init, status })
}

/**
 * Internal error: logs the underlying cause and returns a generic message to
 * the client. Prevents raw Supabase / DB error messages (which can leak schema
 * info) from reaching the browser.
 */
export function jsonServerError(ctx: string, cause: unknown) {
  console.error(`[${ctx}] server error`, cause)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

/**
 * Parse a request body against a validator and return either the typed value
 * or a ready-to-return 400 NextResponse. Usage:
 *
 *   const parsed = await parseBody(req, schema)
 *   if (parsed instanceof NextResponse) return parsed
 *   // parsed is the typed, validated shape
 */
export async function parseBody<T>(
  req: Request,
  schema: Validator<T>
): Promise<T | NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const result: Result<T> = schema.parse(body)
  if (!result.ok) return jsonError(result.error)
  return result.value
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}
