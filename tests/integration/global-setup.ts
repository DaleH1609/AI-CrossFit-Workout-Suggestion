/**
 * tests/integration/global-setup.ts
 *
 * Vitest globalSetup: starts the Postgres testcontainer and runs all
 * migrations once before any integration tests execute.
 *
 * Referenced in vitest.integration.config.ts:
 *   globalSetup: ['tests/integration/global-setup.ts']
 */

import { startDb, stopDb } from './db'

export async function setup(): Promise<void> {
  await startDb()
}

export async function teardown(): Promise<void> {
  await stopDb()
}
