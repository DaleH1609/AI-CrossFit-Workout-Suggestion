-- 040_leads.sql
-- Lead capture + CRM pipeline
-- Leads flow: new → contacted → trial_booked → showed_up → joined → lost

CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  phone       text,
  source      text,                     -- 'website', 'referral', 'walk-in', 'social', etc.
  status      text NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'trial_booked', 'showed_up', 'joined', 'lost')),
  notes       text,
  trial_date  date,                     -- when trial is scheduled
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, email)
);

CREATE INDEX IF NOT EXISTS leads_gym_id_status_idx ON leads (gym_id, status);
CREATE INDEX IF NOT EXISTS leads_gym_id_created_idx ON leads (gym_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admins/owners manage all leads for their gym
CREATE POLICY "admins manage leads"
  ON leads
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = leads.gym_id
        AND u.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = leads.gym_id
        AND u.role IN ('admin', 'owner')
    )
  );

-- Public INSERT — allows website forms to submit without auth
-- (gym_id must match; no SELECT/UPDATE/DELETE for anonymous)
CREATE POLICY "public lead capture"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);
