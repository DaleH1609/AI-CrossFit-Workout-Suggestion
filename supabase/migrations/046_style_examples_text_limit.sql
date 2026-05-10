-- migration 046: cap style_examples.raw_text at 20,000 characters
-- Prevents unbounded AI prompt inflation if a gym owner pastes a very large
-- block of text. 10k chars is well above any realistic example workout set.
ALTER TABLE style_examples
  ADD CONSTRAINT style_examples_raw_text_length
  CHECK (char_length(raw_text) <= 20000);
