# Runbook: Data Recovery

**Owner:** Platform / Backend
**Last reviewed:** 2026-05-12

---

## Overview

Supabase Pro provides point-in-time recovery (PITR) for up to 7 days (Pro) or
30 days (Team/Enterprise). This runbook covers how to recover from data loss
events ranging from a single accidentally-deleted row to a full database restore.

---

## Backup schedule and retention

| Plan | PITR window | Daily logical snapshots |
|---|---|---|
| Free | None | None |
| Pro | 7 days | Yes (auto, managed by Supabase) |
| Team | 30 days | Yes (auto, managed by Supabase) |

Verify your current plan and retention: Supabase Dashboard → Project Settings →
Database → Backups.

**Action:** Confirm at least Pro is active. If the project is on the Free plan,
PITR is unavailable and recovery is not possible without a manual dump.

---

## Scenario 1: Single deleted row (last few minutes)

If a row was deleted within the last few minutes and the transaction log is
still in the Supabase WAL buffer, you may be able to recover via a direct
service-role query before the row is vacuumed.

More realistically, use the gym audit log (if the action was logged):

```sql
SELECT payload
FROM gym_audit_log
WHERE action = 'member.delete'
ORDER BY created_at DESC
LIMIT 5;
```

The `payload` column stores a snapshot of the deleted row if the route that
deleted it populated it (see `docs/runbook/token-rotation.md` for which routes
write to `gym_audit_log`).

If the row is truly gone, proceed to Scenario 2.

---

## Scenario 2: Partial restore (one gym, one table)

Use the Supabase dashboard to branch the database at a point before the
incident, then extract just the rows you need.

### Step-by-step

1. **Identify the incident timestamp** — when did the data exist?
   Ask the affected gym owner: "What time did you last see it working?"
   Add a 15-minute buffer before that time.

2. **Create a recovery branch in Supabase**

   Supabase Dashboard → Branching → Create Branch → set the restore point to
   the timestamp from step 1.

   Branch creation takes 2–5 minutes. The branch is a full copy of the
   database at that point in time; it does not affect production.

3. **Query the branch for the lost rows**

   Connect to the branch database using the branch connection string (shown in
   the dashboard). Extract the rows:

   ```sql
   -- Example: recover a deleted member
   SELECT id, name, email, role, gym_id, created_at
   FROM users
   WHERE gym_id = '<affected-gym-id>'
     AND id = '<deleted-user-id>';
   ```

4. **Re-insert into production**

   Use the service-role connection string for production. Insert only the
   specific rows you extracted. Do not replay a full table dump — it may
   conflict with changes that happened after the incident.

   ```sql
   -- Run against production with service-role key
   INSERT INTO users (id, name, email, role, gym_id, created_at, ...)
   VALUES ('<recovered values>');
   ```

5. **Delete the recovery branch**

   Supabase Dashboard → Branching → delete the branch. Branches incur compute
   cost while running.

6. **Log the recovery in the admin audit log**

   ```sql
   INSERT INTO admin_audit_log (admin_email, action, target_id, target_name)
   VALUES ('admin@yourdomain.com', 'data_recovery', '<gym-id>', '<gym-name>');
   ```

---

## Scenario 3: Full database restore (PITR)

Use this only for catastrophic data loss (e.g., a migration dropped a table,
a bug bulk-deleted all bookings for a gym).

**Warning:** A full PITR replaces the entire database. All changes after the
restore point — including legitimate changes by other gyms — are lost.
Always attempt a partial restore (Scenario 2) first.

### Step-by-step

1. **Announce a maintenance window.** All writes during the restore will be
   lost. Notify active gym owners.

2. **Supabase Dashboard → Database → Backups → Restore**

   Select "Point in Time Recovery" and set the target timestamp to
   approximately 5 minutes before the incident.

3. **Wait for the restore to complete** (typically 10–30 minutes for a small
   database).

4. **Verify the restore:**

   ```sql
   -- Check that data exists as expected
   SELECT COUNT(*) FROM users WHERE gym_id = '<affected-gym-id>';
   SELECT COUNT(*) FROM bookings WHERE gym_id = '<affected-gym-id>';
   ```

5. **Replay missed writes.** Any legitimate actions taken between the restore
   point and the incident cannot be automatically replayed. Contact affected
   gym owners and ask them to re-enter data, or replay from the `gym_audit_log`
   if entries survived in email/notifications.

6. **Re-run any migrations that were applied after the restore point.**
   Check `supabase/migrations/` against the restored schema:

   ```sql
   -- Compare against what you expect from your migration files
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

---

## Scenario 4: Manual pg_dump (if PITR is unavailable)

If the project is on the Free plan, create a manual logical backup immediately.

```bash
# Install psql client if needed
brew install postgresql

# Set from: Supabase Dashboard → Project Settings → Database → Connection String
PGPASSWORD='<db-password>' pg_dump \
  --host db.<project-ref>.supabase.co \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  --schema public \
  --no-owner \
  --no-acl \
  --file "crossfit-backup-$(date +%Y%m%d-%H%M%S).sql"
```

Store the dump file in a separate location (S3, Backblaze, local encrypted
disk). Do not commit it to the repository.

To restore from the dump into a fresh Supabase project:

```bash
PGPASSWORD='<new-db-password>' psql \
  --host db.<new-project-ref>.supabase.co \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  < crossfit-backup-YYYYMMDD-HHMMSS.sql
```

---

## Quarterly restore test

**Perform this once per quarter:**

1. Create a new throwaway Supabase project (Free tier).
2. Run pg_dump against production (see Scenario 4 above).
3. Restore the dump into the throwaway project.
4. Verify key tables exist and row counts are plausible:

   ```sql
   SELECT
     (SELECT COUNT(*) FROM gyms)    AS gyms,
     (SELECT COUNT(*) FROM users)   AS users,
     (SELECT COUNT(*) FROM bookings) AS bookings;
   ```

5. Delete the throwaway project.
6. Record the date in this file under "Test history" below.

If the restore fails, escalate immediately — it means your backup is
unusable and you have no recovery path.

---

## Contacts and escalation

| Who | Role | When to contact |
|---|---|---|
| Supabase Support | Database infrastructure | PITR unavailable, restore fails |
| Vercel Support | Application layer | Deployment rollback needed |
| Team on-call | Business decision | Full PITR that loses data from other gyms |

Supabase support: https://supabase.com/dashboard/support/new

---

## Test history

| Date | Who | Method | Result |
|---|---|---|---|
| — | — | — | — |

Record each quarterly test here.
