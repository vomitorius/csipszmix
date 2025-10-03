-- Migration: Add Magyar Totó support
-- This migration adds the toto_rounds table and modifies existing schema

-- Add toto_rounds table for weekly Magyar Totó rounds
CREATE TABLE IF NOT EXISTS toto_rounds (
  id TEXT PRIMARY KEY,                    -- e.g., "2025-week-40"
  week_number INTEGER NOT NULL,           -- ISO week number
  week_label TEXT NOT NULL,               -- e.g., "40. hét"
  week_start DATE NOT NULL,               -- Monday of the week
  week_end DATE NOT NULL,                 -- Sunday of the week
  year INTEGER NOT NULL,                  -- Year
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_toto_rounds_week ON toto_rounds(year, week_number);
CREATE INDEX IF NOT EXISTS idx_toto_rounds_status ON toto_rounds(status);
CREATE INDEX IF NOT EXISTS idx_toto_rounds_week_start ON toto_rounds(week_start);

-- Add trigger for updated_at
CREATE TRIGGER update_toto_rounds_updated_at BEFORE UPDATE ON toto_rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Rename events table to matches (more appropriate for Totó context)
-- Note: This is a breaking change - we'll keep events table but add matches table
-- to allow gradual migration

-- Create matches table (similar to events but linked to rounds)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  round_id TEXT REFERENCES toto_rounds(id) ON DELETE CASCADE,
  match_order INTEGER NOT NULL,          -- Position on the voucher (1-14)
  league TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL,          -- Match start time
  odds_home DECIMAL(10, 2),              -- Optional (may not be needed for Totó)
  odds_draw DECIMAL(10, 2),              -- Optional
  odds_away DECIMAL(10, 2),              -- Optional
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_matches_round_id ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_order ON matches(round_id, match_order);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Add trigger for updated_at
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add match_id column to sources (to reference both events and matches)
ALTER TABLE sources ADD COLUMN IF NOT EXISTS match_id TEXT REFERENCES matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sources_match_id ON sources(match_id);

-- Add match_id column to facts
ALTER TABLE facts ADD COLUMN IF NOT EXISTS match_id TEXT REFERENCES matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_facts_match_id ON facts(match_id);

-- Add match_id column to predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS match_id TEXT REFERENCES matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);

-- Comments for documentation
COMMENT ON TABLE toto_rounds IS 'Weekly Magyar Totó rounds (13+1 matches per week)';
COMMENT ON TABLE matches IS 'Individual matches within a Totó round';
COMMENT ON COLUMN matches.match_order IS 'Position on the Totó voucher (1-14)';
COMMENT ON COLUMN matches.odds_home IS 'Optional - odds may not be part of Totó system';
