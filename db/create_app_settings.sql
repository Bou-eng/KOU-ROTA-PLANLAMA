-- Ensure application schema exists
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
