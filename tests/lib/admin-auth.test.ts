// tests/lib/admin-auth.test.ts
import { describe, it, expect } from 'vitest'
import { isAdminEmail } from '@/lib/auth-helpers'

// isAdminEmail is the real implementation from lib/auth-helpers.ts.
// Passing an explicit envValue (second arg) exercises the function without
// mutating process.env, keeping tests side-effect free.

describe('admin email check', () => {
  it('allows email in list', () => {
    expect(isAdminEmail('admin@example.com', 'admin@example.com,other@example.com')).toBe(true)
  })

  it('blocks email not in list', () => {
    expect(isAdminEmail('intruder@example.com', 'admin@example.com')).toBe(false)
  })

  it('blocks all when ADMIN_EMAILS is empty — fail-closed', () => {
    expect(isAdminEmail('admin@example.com', '')).toBe(false)
    expect(isAdminEmail('admin@example.com', undefined)).toBe(false)
  })

  it('trims whitespace around email addresses', () => {
    expect(isAdminEmail('admin@example.com', ' admin@example.com , other@example.com ')).toBe(true)
  })

  it('blocks when ADMIN_EMAILS has only whitespace', () => {
    expect(isAdminEmail('admin@example.com', '   ,  ')).toBe(false)
  })

  it('matches case-insensitively — real impl lowercases both sides', () => {
    expect(isAdminEmail('Admin@Example.COM', 'admin@example.com')).toBe(true)
  })
})
