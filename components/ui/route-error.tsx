'use client'

/**
 * Reusable route-segment error boundary. Replaces four near-duplicate
 * `app/**\/error.tsx` files that all rendered the same "Something went wrong"
 * fallback with hardcoded hex colors. Uses theme tokens so it respects light
 * and dark modes.
 */
export function RouteError({
  reset,
  title = 'Something went wrong.',
}: {
  error?: Error & { digest?: string }
  reset: () => void
  title?: string
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <p className="text-danger">{title}</p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer border-none bg-transparent text-accent underline"
      >
        Try again
      </button>
    </div>
  )
}
