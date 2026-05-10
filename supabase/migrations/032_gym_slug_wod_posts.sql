-- F38: Public gym page slug
-- F39: WOD blog posts

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

CREATE UNIQUE INDEX IF NOT EXISTS gyms_slug_unique ON gyms(slug) WHERE slug IS NOT NULL;

-- WOD blog posts
CREATE TABLE IF NOT EXISTS wod_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,          -- markdown
  workout_date date,                  -- optional link to a specific workout date
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wod_posts_gym_published ON wod_posts(gym_id, published, created_at DESC);

ALTER TABLE wod_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "public read published posts"
  ON wod_posts
  FOR SELECT
  USING (published = true);

-- Admins can manage their gym's posts
CREATE POLICY "admins manage wod posts"
  ON wod_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role = 'admin'
    )
  );
