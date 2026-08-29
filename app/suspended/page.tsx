// app/suspended/page.tsx
export default function SuspendedPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? 'support'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Account suspended</h1>
        <p className="text-secondary">
          Your gym account has been suspended. Please contact support at{' '}
          {supportEmail !== 'support' ? (
            <a href={`mailto:${supportEmail}`} className="text-accent underline">
              {supportEmail}
            </a>
          ) : (
            <span className="text-accent">support</span>
          )}{' '}
          to resolve this.
        </p>
      </div>
    </div>
  )
}
