import { AuthBrandPanel } from '@/components/auth/brand-panel'

export default function MfaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}
