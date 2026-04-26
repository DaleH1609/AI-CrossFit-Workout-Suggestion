// lib/claude/client.ts
//
// Shared Anthropic client factory. The SDK constructor accepts an undefined
// apiKey without complaint and only surfaces the problem as a cryptic 401 at
// request time — which is painful to debug in Vercel logs. This helper fails
// fast with a clear message the first time it's used without the env var.

import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  _client = new Anthropic({ apiKey })
  return _client
}
