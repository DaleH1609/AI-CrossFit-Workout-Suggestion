// lib/validation/z.ts — a tiny, zero-dependency zod-style validator.
//
// We needed runtime input validation on every route handler to close the
// "no input validation" gap from the API-contract review. We can't pull in
// `zod` (external registry not available), so this hand-rolled builder gives
// us the same ergonomics for the small set of primitive types we need.
//
// Usage:
//   const bodySchema = z.object({
//     instanceId: z.uuid(),
//     notes: z.string({ max: 500 }).optional(),
//   })
//   const parsed = bodySchema.parse(await req.json())
//   if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
//   parsed.value // { instanceId: string, notes?: string }

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export interface Validator<T> {
  readonly _t?: T // phantom for inference
  parse(input: unknown, path?: string): Result<T>
  optional(): Validator<T | undefined>
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

function fail<T = never>(error: string): Result<T> {
  return { ok: false, error }
}

function wrap<T>(parse: (input: unknown, path?: string) => Result<T>): Validator<T> {
  const v: Validator<T> = {
    parse,
    optional() {
      return wrap<T | undefined>((input, path) => {
        if (input === undefined || input === null) return ok(undefined)
        return parse(input, path)
      })
    },
  }
  return v
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const z = {
  string(opts: { min?: number; max?: number; trim?: boolean; pattern?: RegExp } = {}): Validator<string> {
    return wrap<string>((input, path = 'value') => {
      if (typeof input !== 'string') return fail(`${path} must be a string`)
      const v = opts.trim ? input.trim() : input
      if (opts.min !== undefined && v.length < opts.min) return fail(`${path} must be at least ${opts.min} chars`)
      if (opts.max !== undefined && v.length > opts.max) return fail(`${path} must be at most ${opts.max} chars`)
      if (opts.pattern && !opts.pattern.test(v)) return fail(`${path} has invalid format`)
      return ok(v)
    })
  },

  number(opts: { min?: number; max?: number; int?: boolean } = {}): Validator<number> {
    return wrap<number>((input, path = 'value') => {
      if (typeof input !== 'number' || Number.isNaN(input)) return fail(`${path} must be a number`)
      if (opts.int && !Number.isInteger(input)) return fail(`${path} must be an integer`)
      if (opts.min !== undefined && input < opts.min) return fail(`${path} must be >= ${opts.min}`)
      if (opts.max !== undefined && input > opts.max) return fail(`${path} must be <= ${opts.max}`)
      return ok(input)
    })
  },

  boolean(): Validator<boolean> {
    return wrap<boolean>((input, path = 'value') => {
      if (typeof input !== 'boolean') return fail(`${path} must be a boolean`)
      return ok(input)
    })
  },

  uuid(): Validator<string> {
    return wrap<string>((input, path = 'value') => {
      if (typeof input !== 'string' || !UUID_RE.test(input)) return fail(`${path} must be a UUID`)
      return ok(input)
    })
  },

  email(): Validator<string> {
    return wrap<string>((input, path = 'value') => {
      if (typeof input !== 'string') return fail(`${path} must be a string`)
      const v = input.trim().toLowerCase()
      if (!EMAIL_RE.test(v)) return fail(`${path} must be a valid email`)
      return ok(v)
    })
  },

  // YYYY-MM-DD
  isoDate(): Validator<string> {
    return wrap<string>((input, path = 'value') => {
      if (typeof input !== 'string' || !DATE_RE.test(input)) return fail(`${path} must be YYYY-MM-DD`)
      const d = new Date(input + 'T00:00:00Z')
      if (Number.isNaN(d.getTime())) return fail(`${path} is not a valid date`)
      return ok(input)
    })
  },

  // HH:MM 24-hour
  time(): Validator<string> {
    return wrap<string>((input, path = 'value') => {
      if (typeof input !== 'string' || !TIME_RE.test(input)) return fail(`${path} must be HH:MM`)
      return ok(input)
    })
  },

  enum<T extends readonly string[]>(values: T): Validator<T[number]> {
    return wrap<T[number]>((input, path = 'value') => {
      if (typeof input !== 'string' || !values.includes(input as T[number])) {
        return fail(`${path} must be one of: ${values.join(', ')}`)
      }
      return ok(input as T[number])
    })
  },

  array<T>(of: Validator<T>, opts: { min?: number; max?: number } = {}): Validator<T[]> {
    return wrap<T[]>((input, path = 'value') => {
      if (!Array.isArray(input)) return fail(`${path} must be an array`)
      if (opts.min !== undefined && input.length < opts.min) return fail(`${path} must have at least ${opts.min} items`)
      if (opts.max !== undefined && input.length > opts.max) return fail(`${path} must have at most ${opts.max} items`)
      const out: T[] = []
      for (let i = 0; i < input.length; i++) {
        const r = of.parse(input[i], `${path}[${i}]`)
        if (!r.ok) return fail(r.error)
        out.push(r.value)
      }
      return ok(out)
    })
  },

  object<S extends Record<string, Validator<unknown>>>(
    shape: S
  ): Validator<{ [K in keyof S]: S[K] extends Validator<infer U> ? U : never }> {
    return wrap((input, path = 'body') => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return fail(`${path} must be an object`)
      }
      const obj = input as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(shape)) {
        const r = shape[key].parse(obj[key], `${path}.${key}`)
        if (!r.ok) return fail(r.error)
        if (r.value !== undefined) out[key] = r.value
      }
      return ok(out as { [K in keyof S]: S[K] extends Validator<infer U> ? U : never })
    })
  },

  // Convenience: any string passthrough (no constraints)
  any(): Validator<unknown> {
    return wrap<unknown>(input => ok(input))
  },
}

export type Infer<V> = V extends Validator<infer T> ? T : never
