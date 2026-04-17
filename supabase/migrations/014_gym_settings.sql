ALTER TABLE gyms ADD COLUMN IF NOT EXISTS default_capacity int NOT NULL DEFAULT 20;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS booking_advance_hours int NOT NULL DEFAULT 0;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS show_member_names boolean NOT NULL DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS notify_workout_published boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS notify_booking_confirmed boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS contact_email text;
