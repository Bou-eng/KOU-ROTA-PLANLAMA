-- Migration: Create graph tables for road network and shortest path caching
-- Schema: app
-- Date: 2025-12-24

-- Create station_edges table
CREATE TABLE IF NOT EXISTS app.station_edges (
    id BIGSERIAL PRIMARY KEY,
    from_station_id BIGINT NOT NULL REFERENCES app.stations(id) ON DELETE CASCADE,
    to_station_id BIGINT NOT NULL REFERENCES app.stations(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION NOT NULL,
    is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT uq_station_edge UNIQUE (from_station_id, to_station_id),
    CONSTRAINT ck_distance_positive CHECK (distance_km > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_station_edges_from ON app.station_edges(from_station_id);
CREATE INDEX IF NOT EXISTS idx_station_edges_to ON app.station_edges(to_station_id);

-- Create station_paths_cache table
CREATE TABLE IF NOT EXISTS app.station_paths_cache (
    from_station_id BIGINT NOT NULL,
    to_station_id BIGINT NOT NULL,
    total_distance_km DOUBLE PRECISION NOT NULL,
    path_station_ids_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Primary key
    PRIMARY KEY (from_station_id, to_station_id)
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS idx_paths_cache_from ON app.station_paths_cache(from_station_id);
CREATE INDEX IF NOT EXISTS idx_paths_cache_to ON app.station_paths_cache(to_station_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Graph tables created successfully!';
    RAISE NOTICE '  - app.station_edges: Stores road connections with distances';
    RAISE NOTICE '  - app.station_paths_cache: Caches computed shortest paths';
END $$;
