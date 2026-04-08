ALTER TABLE class_slot_templates
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
  ADD COLUMN IF NOT EXISTS workout_notes text;

ALTER TABLE class_instances
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
  ADD COLUMN IF NOT EXISTS workout_notes text;
