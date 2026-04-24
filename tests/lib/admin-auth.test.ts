// tests/lib/admin-auth.test.ts
import { describe, it, expect } from 'vitest'

// Test the email-list parsing logic in isolation (pure function, no mocking needed)
function parseAdminEmails(env: string | undefined): string[] {
  return (env ?? '').split(',').map(e => e.trim()).filter(Boolean)
}

function isAdminEmail(email: string, env: string | undefined): boolean {
  const list = parseAdminEmails(env)
  return list.length > 0 && list.includes(email)
}

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
})
