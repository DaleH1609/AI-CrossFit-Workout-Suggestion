import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-6xl font-display font-bold text-foreground">404</p>
        <p className="text-lg text-muted-foreground">Page not found.</p>
        <Link
          href="/"
          className="inline-block mt-4 px-4 py-2 rounded bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
