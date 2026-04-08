-- Class types: owner-defined categories for class slots (e.g. WOD, Run Club, Hyrox)
CREATE TABLE class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#eab308',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_class_types" ON class_types
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "members_read_class_types" ON class_types
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX ON class_types(gym_id);

-- Add class_type_id FK to templates and instances (nullable — backward compat)
ALTER TABLE class_slot_templates
  ADD COLUMN IF NOT EXISTS class_type_id uuid REFERENCES class_types(id) ON DELETE SET NULL;

ALTER TABLE class_instances
  ADD COLUMN IF NOT EXISTS class_type_id uuid REFERENCES class_types(id) ON DELETE SET NULL;
