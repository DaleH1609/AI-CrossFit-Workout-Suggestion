# Architecture notes

## REST route handlers vs. server actions

All mutations in this app go through `app/api/**/route.ts` handlers rather than
Next.js server actions. This is a deliberate choice, not a pending migration.

**Why REST handlers:**

1. **Consistent auth surface.** Every mutation passes through `requireMemberAuth`
   / `requireOwnerAuth` in `lib/auth-helpers.ts`, which returns either a typed
   session or a pre-formed `NextResponse`. Server actions would split auth
   between the route layer and the action call site — duplicating the guard or
   moving it into a wrapper that isn't obviously reusable.

2. **Uniform validation + error shape.** `parseBody(req, schema)` + the
   `jsonOk` / `jsonError` / `jsonServerError` envelope in `lib/api/response.ts`
   are applied identically across every endpoint. The frontend reads one shape
   everywhere: `{ data }` on success, `{ error }` on failure. Mixing server
   actions in would force two error-handling paths in the client.

3. **Testability.** The handlers are plain async functions that take a
   `Request` and return a `Response`. Vitest hits them directly without a
   rendering layer or a dev-server.

4. **Cron + external callers.** `app/api/cron/*` are invoked by Vercel Cron
   with a bearer secret. Server actions aren't reachable from outside the
   Next.js dispatcher, so we'd still need REST for cron — and splitting would
   leave us maintaining two styles.

5. **Rate-limit + observability.** If we add edge rate limiting or per-route
   logging, it slots in at one layer (the route handler) rather than two.

**When we'd reconsider:** if a future form becomes heavy on progressive
enhancement (no-JS fallback, `useFormState` with inline validation), the
server-action ergonomics would start to pay off. At that point migrate the
specific form — don't rewrite the whole mutation layer.

## Form state lives in hooks

Form-heavy components (`components/schedule/capacity-popover.tsx`,
`components/workout/workout-edit-modal.tsx`) keep their state + submit logic in
dedicated hooks under `lib/hooks/` (`use-capacity-form.ts`,
`use-workout-edit-form.ts`). The components themselves are pure view
functions that wire hook state to JSX. This makes the form behaviour unit
testable independently of the DOM.

## Route-level error boundaries

Each `app/**/error.tsx` renders the shared `RouteError` component from
`components/ui/route-error.tsx`. Add instrumentation (Sentry, Logsnag) once,
there, rather than in four near-identical files.

## Shared types

Domain types (workouts, schedule templates, class types, movement analysis)
live in `lib/types.ts`. API-adjacent shapes that are tied to a specific query
(e.g. `BookingWithInstance` — a booking joined to its instance) live in
`lib/bookings/types.ts` so the route that uses them and any other route
needing the same shape stay in sync. Component-local `Props` interfaces
stay inline with the component.
