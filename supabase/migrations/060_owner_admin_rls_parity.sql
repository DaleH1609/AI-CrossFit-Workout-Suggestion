-- 060_owner_admin_rls_parity.sql
-- Migrations 030-038 created admin-access policies that only checked role = 'admin',
-- inadvertently excluding gym owners (role = 'owner'). This migration replaces each
-- such policy so that both 'admin' and 'owner' have equivalent access.
-- Routes already perform role checks at the application layer; this brings the
-- RLS defence-in-depth layer into sync with that intent.

-- Helper macro: checks caller is owner or admin of a given gym_id column reference
-- (inlined per-policy since PG doesn't support macro substitution)

------------------------------------------------------------
-- 031: class_feedback
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
CREATE POLICY "admins read gym feedback"
  ON class_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 032: wod_posts
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
CREATE POLICY "admins manage wod posts"
  ON wod_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 033: dropin_passes
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
CREATE POLICY "admins manage passes"
  ON dropin_passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = dropin_passes.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 034: member_badges, referrals
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
CREATE POLICY "admins read gym badges"
  ON member_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_badges.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 035: workout_edits
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
CREATE POLICY "admins manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 036: benchmark_results
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
CREATE POLICY "admins read gym benchmark results"
  ON benchmark_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = benchmark_results.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 037: gym_webhooks
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
CREATE POLICY "admins manage gym webhooks"
  ON gym_webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_webhooks.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 038: push_subscriptions
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
CREATE POLICY "admins read gym push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = push_subscriptions.gym_id
        AND u.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 030: member_notes, member_skills
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
CREATE POLICY "admins manage member notes"
  ON member_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );
