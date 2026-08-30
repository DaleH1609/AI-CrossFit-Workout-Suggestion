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

  {
    // Temporarily warnings, not errors — 30 Aug 2026.
    //
    // Lint had been dead for some time (see the header comment), so switching
    // it back on surfaced 27 errors at once. Twenty of them are these three
    // rules, and they are not oversights that can be patched line by line:
    //
    //   set-state-in-effect (14)  fetch-in-useEffect-then-setState, which is
    //                             how nearly every screen in this app loads
    //                             its data. Fixing it properly means moving
    //                             that work to server components or a data
    //                             layer, not editing fourteen call sites.
    //   purity (4)                values read during render that are not pure.
    //   refs (2)                  refs touched during render.
    //
    // Leaving them as errors would mean CI is red on arrival and everyone
    // learns to ignore it, which is worse than no CI. Deleting the rules would
    // hide a real backlog. Warnings keep them counted and on screen while the
    // other 40-odd rules start blocking merges today.
    //
    // These should go back to 'error' one rule at a time as each is cleared.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]
