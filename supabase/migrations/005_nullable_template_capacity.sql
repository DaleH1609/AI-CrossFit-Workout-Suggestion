-- supabase/migrations/005_nullable_template_capacity.sql
ALTER TABLE class_slot_templates ALTER COLUMN capacity DROP NOT NULL;

-- Existing "20" values were the old hardcoded default, not intentional overrides.
-- Set them to null so they inherit from the new defaults system.
UPDATE class_slot_templates SET capacity = NULL WHERE capacity IS NOT NULL;
