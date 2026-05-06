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
        ],
      },
    ]
  },
}

export default nextConfig;
