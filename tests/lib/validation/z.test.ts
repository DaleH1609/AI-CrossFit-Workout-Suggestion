// tests/lib/validation/z.test.ts
import { describe, it, expect } from 'vitest'
import { z } from '@/lib/validation/z'

describe('z.string', () => {
  it('accepts a valid string', () => {
    expect(z.string().parse('hello')).toEqual({ ok: true, value: 'hello' })
  })
  it('rejects non-strings', () => {
    const r = z.string().parse(42)
    expect(r.ok).toBe(false)
  })
  it('enforces min length', () => {
    expect(z.string({ min: 3 }).parse('ab').ok).toBe(false)
    expect(z.string({ min: 3 }).parse('abc').ok).toBe(true)
  })
  it('enforces max length', () => {
    expect(z.string({ max: 2 }).parse('abc').ok).toBe(false)
  })
  it('trims when configured', () => {
    const r = z.string({ trim: true }).parse('  hi  ')
    expect(r).toEqual({ ok: true, value: 'hi' })
  })
})

describe('z.number', () => {
  it('accepts valid numbers', () => {
    expect(z.number().parse(3.14).ok).toBe(true)
  })
  it('rejects NaN', () => {
    expect(z.number().parse(NaN).ok).toBe(false)
  })
  it('enforces integer', () => {
    expect(z.number({ int: true }).parse(3.5).ok).toBe(false)
    expect(z.number({ int: true }).parse(3).ok).toBe(true)
  })
  it('enforces min/max', () => {
    expect(z.number({ min: 1, max: 10 }).parse(0).ok).toBe(false)
    expect(z.number({ min: 1, max: 10 }).parse(11).ok).toBe(false)
    expect(z.number({ min: 1, max: 10 }).parse(5).ok).toBe(true)
  })
})

describe('z.uuid', () => {
  it('accepts a well-formed UUID', () => {
    const r = z.uuid().parse('550e8400-e29b-41d4-a716-446655440000')
    expect(r.ok).toBe(true)
  })
  it('rejects non-UUIDs', () => {
    expect(z.uuid().parse('not-a-uuid').ok).toBe(false)
    expect(z.uuid().parse(123).ok).toBe(false)
  })
})

describe('z.email', () => {
  it('lowercases and trims valid emails', () => {
    const r = z.email().parse('  John@Example.COM  ')
    expect(r).toEqual({ ok: true, value: 'john@example.com' })
  })
  it('rejects malformed emails', () => {
    expect(z.email().parse('not-an-email').ok).toBe(false)
    expect(z.email().parse('a@b').ok).toBe(false)
  })
})

describe('z.time', () => {
  it('accepts HH:MM', () => {
    expect(z.time().parse('09:30').ok).toBe(true)
    expect(z.time().parse('23:59').ok).toBe(true)
    expect(z.time().parse('00:00').ok).toBe(true)
  })
  it('rejects invalid times', () => {
    expect(z.time().parse('24:00').ok).toBe(false)
    expect(z.time().parse('9:30').ok).toBe(false) // missing leading zero
    expect(z.time().parse('12:60').ok).toBe(false)
  })
})

describe('z.isoDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(z.isoDate().parse('2026-04-17').ok).toBe(true)
  })
  it('rejects bad formats', () => {
    expect(z.isoDate().parse('2026/04/17').ok).toBe(false)
    expect(z.isoDate().parse('2026-13-01').ok).toBe(false)
  })
})

describe('z.object', () => {
  it('validates nested shape', () => {
    const schema = z.object({
      instanceId: z.uuid(),
      capacity: z.number({ int: true, min: 1, max: 500 }).optional(),
    })
    const r = schema.parse({ instanceId: '550e8400-e29b-41d4-a716-446655440000' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.instanceId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(r.value.capacity).toBeUndefined()
    }
  })

  it('reports per-field errors with path', () => {
    const schema = z.object({ id: z.uuid(), capacity: z.number({ int: true }) })
    const r = schema.parse({ id: '550e8400-e29b-41d4-a716-446655440000', capacity: 1.5 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/capacity.*integer/)
  })

  it('rejects non-object input', () => {
    expect(z.object({ id: z.uuid() }).parse('nope').ok).toBe(false)
    expect(z.object({ id: z.uuid() }).parse([]).ok).toBe(false)
  })
})

describe('z.enum', () => {
  it('accepts only whitelisted values', () => {
    const status = z.enum(['confirmed', 'cancelled'] as const)
    expect(status.parse('confirmed').ok).toBe(true)
    expect(status.parse('pending').ok).toBe(false)
  })
})

describe('z.array', () => {
  it('validates each item', () => {
    const r = z.array(z.number({ int: true })).parse([1, 2, 3])
    expect(r.ok).toBe(true)
  })
  it('rejects wrong-type items', () => {
    const r = z.array(z.number({ int: true })).parse([1, 'two'])
    expect(r.ok).toBe(false)
  })
})
