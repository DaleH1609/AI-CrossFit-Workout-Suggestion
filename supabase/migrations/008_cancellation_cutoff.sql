ALTER TABLE gyms ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours int NOT NULL DEFAULT 0;
