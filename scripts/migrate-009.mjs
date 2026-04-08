// Run: node scripts/migrate-009.mjs
const SUPABASE_URL = 'https://ncpxagtwgaxgbuxmuvmu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcHhhZ3R3Z2F4Z2J1eG11dm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5Njc1NSwiZXhwIjoyMDg5ODcyNzU1fQ.ZdYy9e-HdZ5CphgfTcY6-2uEI0cI9bq0W5TpZ5B3zAA'

const SQL = `
  ALTER TABLE class_slot_templates
    ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
    ADD COLUMN IF NOT EXISTS workout_notes text;

  ALTER TABLE class_instances
    ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
    ADD COLUMN IF NOT EXISTS workout_notes text;
`

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_migration`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql: SQL }),
})

if (res.ok) {
  console.log('Migration applied successfully')
} else {
  // rpc doesn't exist — fall back to pg_meta
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  })
  const body = await pgRes.text()
  if (pgRes.ok) {
    console.log('Migration applied successfully')
  } else {
    console.error('Both methods failed:', body)
    console.log('\nRun this SQL manually in the Supabase dashboard SQL editor:\n')
    console.log(SQL)
  }
}
