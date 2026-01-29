-- Add center flag to stations
ALTER TABLE app.stations
    ADD COLUMN IF NOT EXISTS is_center BOOLEAN NOT NULL DEFAULT FALSE;
