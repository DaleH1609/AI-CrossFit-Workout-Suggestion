// lib/validation/z.ts
//
// Thin wrapper around Zod that exposes a Result<T>-based API so all existing
// route handlers can call `.parse()` and check `.ok` without throwing.
//
// Usage:
//   const bodySchema = z.object({
//     instanceId: z.uuid(),
//     notes: z.string({ max: 500 }).optional(),
//   })
//   const parsed = bodySchema.parse(await req.json())
//   if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
//   parsed.value // { instanceId: string, notes?: string }

import { z as _z, type ZodTypeAny } from 'zod'

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export interface Validator<T> {
  readonly _t?: T // phantom for inference
  parse(input: unknown, path?: string): Result<T>
  optional(): Validator<T | undefined>
}

export type Infer<V> = V extends Validator<infer T> ? T : never

function fromZod<T>(schema: ZodTypeAny): Validator<T> {
  const parse: Validator<T>['parse'] = (input, path = 'value') => {
    const r = schema.safeParse(input)
    if (r.success) return { ok: true, value: r.data as T }
    const msg = r.error.issues[0]?.message ?? 'Validation failed'
    // Error messages use 'value' as a placeholder — substitute the real path
    return { ok: false, error: path !== 'value' ? msg.replace(/^value/, path) : msg }
  }
  return {
    parse,
    optional(): Validator<T | undefined> {
      // Treat an explicit null exactly like an absent key.
      //
      // This previously delegated to Zod's .optional(), which accepts
      // undefined but rejects null — while wrap()'s optional() below, used by
      // object and array, has always accepted both. Leaf types (number,
      // string, uuid, ...) go through this path, so the two disagreed.
      //
      // That divergence broke the schedule grid: the client sends
      // `capacity: null` to mean "no override, inherit the default", and
      // every POST and PATCH came back 400 "capacity must be a number".
      // Sending null for "no value" is ordinary JSON, and the object
      // validator already drops undefined values, so an optional field that
      // rejects null is a trap rather than a safeguard.
      return wrap<T | undefined>((input, p) => {
        if (input === undefined || input === null) return { ok: true, value: undefined }
        return parse(input, p)
      })
    },
  }
}

// array and object compose over Validator<T> instances directly, so they
// cannot delegate to Zod internally — they use the same hand-rolled logic as
// before. All leaf types (string, number, boolean, uuid, email, isoDate, time,
// enum) delegate to Zod's battle-tested validators.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function wrap<T>(parse: (input: unknown, path?: string) => Result<T>): Validator<T> {
  return {
    parse,
    optional(): Validator<T | undefined> {
      return wrap<T | undefined>((input, path) => {
        if (input === undefined || input === null) return { ok: true, value: undefined }
        return parse(input, path)
      })
    },
  }
}

export const z = {
  string(opts: { min?: number; max?: number; trim?: boolean; pattern?: RegExp } = {}): Validator<string> {
    let schema = _z.string({ error: 'value must be a string' })
    if (opts.min !== undefined) schema = schema.min(opts.min, `value must be at least ${opts.min} chars`)
    if (opts.max !== undefined) schema = schema.max(opts.max, `value must be at most ${opts.max} chars`)
    if (opts.pattern) schema = schema.regex(opts.pattern, 'value has invalid format')
    if (opts.trim) {
      // Transform then validate — Zod pipelines chain a transform before the constraints
      const trimmed = _z.string().transform(s => s.trim()).pipe(schema)
      return fromZod<string>(trimmed)
    }
    return fromZod<string>(schema)
  },

  number(opts: { min?: number; max?: number; int?: boolean } = {}): Validator<number> {
    let schema = _z.number({ error: 'value must be a number' })
    if (opts.int) schema = schema.int('value must be an integer')
    if (opts.min !== undefined) schema = schema.min(opts.min, `value must be >= ${opts.min}`)
    if (opts.max !== undefined) schema = schema.max(opts.max, `value must be <= ${opts.max}`)
    return fromZod<number>(schema)
  },

  boolean(): Validator<boolean> {
    return fromZod<boolean>(_z.boolean({ error: 'value must be a boolean' }))
  },

  uuid(): Validator<string> {
    return fromZod<string>(_z.string().regex(UUID_RE, 'value must be a UUID'))
  },

  email(): Validator<string> {
    // Normalise to lowercase before validation — replicate original behaviour
    return wrap<string>((input) => {
      if (typeof input !== 'string') return { ok: false, error: 'value must be a string' }
      const v = input.trim().toLowerCase()
      const r = _z.string().email('value must be a valid email').safeParse(v)
      if (r.success) return { ok: true, value: v }
      return { ok: false, error: r.error.issues[0]?.message ?? 'value must be a valid email' }
    })
  },

  // YYYY-MM-DD
  isoDate(): Validator<string> {
    return fromZod<string>(
      _z.string()
        .regex(DATE_RE, 'value must be YYYY-MM-DD')
        .refine(s => !Number.isNaN(new Date(s + 'T00:00:00Z').getTime()), 'value is not a valid date')
    )
  },

  // HH:MM 24-hour
  time(): Validator<string> {
    return fromZod<string>(_z.string().regex(TIME_RE, 'value must be HH:MM'))
  },

  enum<T extends readonly string[]>(values: T): Validator<T[number]> {
    return fromZod<T[number]>(
      _z.enum(values as unknown as [string, ...string[]], {
        error: `value must be one of: ${values.join(', ')}`,
      })
    )
  },

  array<T>(of: Validator<T>, opts: { min?: number; max?: number } = {}): Validator<T[]> {
    return wrap<T[]>((input, path = 'value') => {
      if (!Array.isArray(input)) return { ok: false, error: `${path} must be an array` }
      if (opts.min !== undefined && input.length < opts.min) return { ok: false, error: `${path} must have at least ${opts.min} items` }
      if (opts.max !== undefined && input.length > opts.max) return { ok: false, error: `${path} must have at most ${opts.max} items` }
      const out: T[] = []
      for (let i = 0; i < input.length; i++) {
        const r = of.parse(input[i], `${path}[${i}]`)
        if (!r.ok) return { ok: false, error: r.error }
        out.push(r.value)
      }
      return { ok: true, value: out }
    })
  },

  object<S extends Record<string, Validator<unknown>>>(
    shape: S
  ): Validator<{ [K in keyof S]: S[K] extends Validator<infer U> ? U : never }> {
    return wrap((input, path = 'body') => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, error: `${path} must be an object` }
      }
      const obj = input as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(shape)) {
        const r = shape[key].parse(obj[key], `${path}.${key}`)
        if (!r.ok) return { ok: false, error: r.error }
        if (r.value !== undefined) out[key] = r.value
      }
      return { ok: true, value: out as { [K in keyof S]: S[K] extends Validator<infer U> ? U : never } }
    })
  },

  // Convenience: any value passthrough (no constraints)
  any(): Validator<unknown> {
    return fromZod<unknown>(_z.unknown())
  },
}
