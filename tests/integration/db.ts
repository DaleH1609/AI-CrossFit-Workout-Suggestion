/**
 * tests/integration/db.ts
 *
 * Manages a single Postgres testcontainer shared across the entire integration
 * test suite.  Call `startDb()` in a global setup file and `stopDb()` in
 * globalTeardown.  Within each test file, call `getPool()` to get a connection
 * pool, or `withClient()` for a one-shot client.
 *
 * Migration order:
 *   1. supabase-stubs.sql  — auth schema + role stubs (no-op on real Supabase)
 *   2. migrations/*.sql    — all project migrations in filename order
 */

import path from 'path'
import fs from 'fs'
import { Pool, type PoolClient } from 'pg'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer | null = null
let pool: Pool | null = null

export async function startDb(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withReuse()   // re-use a running container between vitest watch runs
    .start()

  pool = new Pool({ connectionString: container.getConnectionUri() })

  await runMigrations(pool)
}

export async function stopDb(): Promise<void> {
  await pool?.end()
  await container?.stop()
  pool = null
  container = null
}

export function getPool(): Pool {
  if (!pool) throw new Error('DB not started — call startDb() in globalSetup')
  return pool
}

/** Run a callback with a dedicated client, then release it. */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

/** Execute a SQL string, logging the first line if it fails. */
async function exec(client: PoolClient, sql: string, label: string): Promise<void> {
  try {
    await client.query(sql)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Migration failed [${label}]: ${msg}`)
  }
}

async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    // 1. Supabase role + auth stubs
    const stubsPath = path.join(__dirname, 'supabase-stubs.sql')
    await exec(client, fs.readFileSync(stubsPath, 'utf8'), 'supabase-stubs.sql')

    // 2. All project migrations in order
    const migrationsDir = path.join(__dirname, '../../supabase/migrations')
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()   // alphabetical = numeric order given 001_, 002_, …

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await exec(client, sql, file)
    }
  } finally {
    client.release()
  }
}
