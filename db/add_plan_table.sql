-- Add Plan table to app schema
CREATE TABLE IF NOT EXISTS app.plans (
    id BIGSERIAL PRIMARY KEY,
    plan_date DATE NOT NULL,
    payload_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_date ON app.plans(plan_date);
