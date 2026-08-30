/**
 * Which model each AI task runs on.
 *
 * These lived inline at five call sites in generate-workouts.ts and had all
 * drifted onto Opus — including tasks capped at 1024 tokens, where the model
 * choice was costing roughly an order of magnitude more than the work needed.
 * Naming them here means the choice is deliberate and reviewable rather than
 * copied from whichever line was edited last.
 *
 * The rule used below: pay for judgement, not for typing.
 *
 *   REASONING — the model is deciding something a coach would be accountable
 *               for. Programming a week, or substituting a movement for an
 *               injured member. Getting these wrong is a bad session or a
 *               hurt athlete, so they run on Sonnet.
 *
 *   SUMMARY   — the model is describing or condensing input it has already
 *               been handed. Rationale text, movement-history analysis. There
 *               is no judgement call to buy, so they run on Haiku.
 *
 * Verified against the models endpoint on 30 Aug 2026 before switching.
 */

/** Programming and scaling decisions. Quality here is the product. */
export const MODEL_REASONING = 'claude-sonnet-5'

/** Explanation and analysis over content the caller already supplies. */
export const MODEL_SUMMARY = 'claude-haiku-4-5-20251001'
