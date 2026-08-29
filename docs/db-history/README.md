# Hand-applied SQL — historical record, DO NOT RUN

These three files were sitting untracked in `supabase/` next to the real
migrations. They are kept here for history and **must not be executed**.

They are the record of a period when migrations were applied by pasting SQL
into the Supabase dashboard SQL editor rather than through the CLI. The header
of `run_messaging_migrations.sql` says so verbatim:

```
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run
```

| File | Size | What it is |
|---|---|---|
| `all_migrations.sql` | 140 KB | Every migration concatenated into one script |
| `all_migrations_safe.sql` | 150 KB | The same, hardened to be re-runnable — 192 `DROP … IF EXISTS` against 50 in the plain version |
| `run_messaging_migrations.sql` | 4.6 KB | Migrations 064 + 065 (messaging), for manual paste |

The jump from 50 to 192 `DROP … IF EXISTS` is the tell: someone had lost track
of which migrations were applied and made the whole file safe to re-run against
a database in an unknown state.

## Why they were moved

Sitting in `supabase/`, they were a foot-gun — 290 KB of duplicated schema one
tab away from the real `supabase/migrations/`. Running the wrong one against
production would drop and recreate live tables.

## The consequence to be aware of

Because this SQL never went through the CLI, `supabase_migrations.schema_migrations`
is probably empty or badly out of sync with `supabase/migrations/`. **Verify
that before running `supabase db push`** — against an untracked database, push
will try to re-apply all 66 migrations to a schema that already has everything.

```bash
supabase login                                    # interactive, needs a browser
supabase link --project-ref ncpxagtwgaxgbuxmuvmu
supabase migration list                           # local vs remote, side by side
```

The live schema itself was verified correct on 2026-08-29 by introspecting
PostgREST: all 37 tables created across the migration set exist in production.
The schema is fine; only the bookkeeping is unreliable.
