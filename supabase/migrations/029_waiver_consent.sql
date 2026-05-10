-- F27: Liability waiver e-signing
-- F28: Photo/video consent

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false;
