-- 057_workout_weeks_status_index.sql
--
-- Pf2: Add a covering index for the most common workout_weeks query pattern.
--
-- getRecentWeeks() and the this-week page both filter on (gym_id, status)
-- and sort by week_start DESC. The existing index from migration 001 covers
-- (gym_id, week_start) but not status, so Postgres must recheck status after
-- the index scan. At low row counts this is fine; as gyms accumulate years of
-- weekly programs (52 rows/year) the extra filter becomes measurable.
--
-- A partial index scoped to published, non-archived rows covers the hot path
-- without bloating writes for draft rows (which are transient and rarely
-- queried by the hot path).

CREATE INDEX IF NOT EXISTS workout_weeks_published_gym_week
  ON workout_weeks (gym_id, week_start DESC)
  WHERE status = 'published' AND archived_at IS NULL;
