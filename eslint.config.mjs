// Flat config for ESLint 9.
//
// The project shipped .eslintrc.json with `next lint` as the lint script, and
// neither half worked any more: Next 16 removed the `next lint` subcommand, so
// `npm run lint` resolved as `next <dir>` and died with "Invalid project
// directory ... /lint", and ESLint 9 does not read .eslintrc by default
// regardless. Lint had quietly stopped running.
//
// eslint-config-next 16 already ships flat configs on its subpath exports, so
// they are spread in directly. Do not reach for FlatCompat here — it expects
// eslintrc-shaped input and blows up validating an already-flat config.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'supabase/**',
      'public/**',
    ],
  },
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]),
  ...(Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript]),
]
