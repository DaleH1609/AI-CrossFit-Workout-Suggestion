/**
 * vitest.integration.config.ts
 *
 * Separate vitest config for integration tests that require a real Postgres
 * database (via testcontainers).  Run with:
 *
 *   npm run test:integration
 *
 * These tests are intentionally excluded from the default `npm test` run
 * because they require Docker and are slower than unit tests.
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    // Integration tests can be slow (container startup + migrations)
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Run tests serially within a file to avoid shared-DB race conditions.
    // Files themselves can run in parallel since each uses its own rows.
    sequence: { concurrent: false },
    // No jsdom — integration tests run in Node
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
