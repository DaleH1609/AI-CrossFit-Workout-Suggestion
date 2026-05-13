-- 061_revoked_admin_rls.sql
-- Add revoked_at IS NULL to all admin/owner RLS policies so that revoked admins
-- cannot read or write gym data even if they still hold a valid session token.
-- The app layer already checks revoked_at (migrations 060 + route updates); this
-- brings the DB-layer defence-in-depth into sync.

------------------------------------------------------------
-- 047: deletion_requests
------------------------------------------------------------
DROP POLICY IF EXISTS "admin manage gym deletion requests" ON deletion_requests;
CREATE POLICY "admin manage gym deletion requests"
  ON deletion_requests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = deletion_requests.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 048: gym_audit_log
------------------------------------------------------------
DROP POLICY IF EXISTS "owner reads gym audit log" ON gym_audit_log;
CREATE POLICY "owner reads gym audit log"
  ON gym_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_audit_log.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: class_feedback
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: wod_posts
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: dropin_passes
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: membership_pauses
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_badges
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: referrals
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: workout_edits
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: benchmark_results
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: gym_webhooks
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: push_subscriptions
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
        AND u.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_notes
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
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_skills
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );
