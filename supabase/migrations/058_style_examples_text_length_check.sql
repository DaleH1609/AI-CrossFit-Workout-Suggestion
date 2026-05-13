-- 058_style_examples_text_length_check.sql
--
-- A5: Add a DB-level length guard on style_examples.raw_text.
--
-- The route handler (app/api/style/route.ts) already caps inputs at 20,000
-- chars, but the column is unbounded TEXT. A future route that forgets the
-- cap, or a direct service-role write, could store arbitrarily large rows and
-- blow up the AI prompt that embeds the raw_text verbatim.
--
-- 50,000 chars is 2.5× the current UI cap — generous enough to never
-- constrain legitimate use while blocking runaway writes.

-- Migration 046 already added a 20,000-char constraint with this same name.
-- Drop it first so we can replace it with the wider 50,000-char safety net.
-- The route handler still enforces the 20k UI cap; the DB constraint is a
-- defence-in-depth floor that catches direct service-role writes.
ALTER TABLE style_examples DROP CONSTRAINT IF EXISTS style_examples_raw_text_length;

ALTER TABLE style_examples
  ADD CONSTRAINT style_examples_raw_text_length
  CHECK (char_length(raw_text) <= 50000);
