/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route, including API redirects (N18).
        source: '/(.*)',
        headers: [
          // Prevent this app from being embedded in an iframe (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing — forces browser to honour Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send full origin only on same-origin requests; redacted on cross-origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Opt out of FLoC / Privacy Sandbox ad-tracking APIs.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS here (not proxy.ts) so API routes get it too — proxy.ts
          // matcher excludes /api/*. 2-year max-age, preload-list eligible.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig;
