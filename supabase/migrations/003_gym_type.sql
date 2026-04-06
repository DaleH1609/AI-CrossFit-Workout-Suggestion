ALTER TABLE gyms ADD COLUMN gym_type text NOT NULL DEFAULT 'crossfit'
  CHECK (gym_type IN ('crossfit', 'hyrox'));
