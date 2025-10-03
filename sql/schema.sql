-- TipMix AI Database Schema
-- PostgreSQL + pgvector for Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Events table: Tippmix futball események
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  league TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  odds_home DECIMAL(10, 2) NOT NULL,
  odds_draw DECIMAL(10, 2) NOT NULL,
  odds_away DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table: Webscraped forrásanyagok
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  published_date TIMESTAMPTZ,
  content TEXT,
  raw_html TEXT,
  language TEXT DEFAULT 'hu',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table: Feldolgozott szövegrészek embedding-gel
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384), -- nomic-embed-text vagy bge-small-en-v1.5 dimensió
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facts table: LLM által kinyert faktumok
CREATE TABLE IF NOT EXISTS facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  fact_type TEXT NOT NULL CHECK (fact_type IN ('injury', 'suspension', 'form', 'coach_change', 'other')),
  entity TEXT NOT NULL, -- Csapat vagy játékos neve
  description TEXT NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.5, -- 0.00 - 1.00
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table: AI predikciók
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('1', 'X', '2')),
  prob_home DECIMAL(5, 4) NOT NULL,
  prob_draw DECIMAL(5, 4) NOT NULL,
  prob_away DECIMAL(5, 4) NOT NULL,
  rationale TEXT,
  top_sources TEXT[],
  confidence DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table: Tippszelvények
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  budget DECIMAL(10, 2) NOT NULL,
  events JSONB NOT NULL, -- [{eventId, outcome, odds}]
  total_odds DECIMAL(10, 2) NOT NULL,
  expected_return DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket variants table: Szelvény variációk
CREATE TABLE IF NOT EXISTS ticket_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  events JSONB NOT NULL,
  total_odds DECIMAL(10, 2) NOT NULL,
  stake DECIMAL(10, 2) NOT NULL,
  expected_return DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_sources_event_id ON sources(event_id);
CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
CREATE INDEX IF NOT EXISTS idx_chunks_source_id ON chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_facts_event_id ON facts(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_sources_content_fts ON sources USING gin(to_tsvector('hungarian', content));
CREATE INDEX IF NOT EXISTS idx_facts_description_fts ON facts USING gin(to_tsvector('hungarian', description));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vector similarity search function for RAG
-- This function enables semantic search through document chunks
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(384),
  event_id_filter text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  source_id uuid,
  source_url text,
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    c.id,
    c.content,
    c.source_id,
    s.url as source_url,
    (c.embedding <=> query_embedding) as distance
  FROM chunks c
  JOIN sources s ON c.source_id = s.id
  WHERE s.event_id = event_id_filter
    AND (c.embedding <=> query_embedding) < match_threshold
  ORDER BY distance
  LIMIT match_count;
$$;

-- Note: The embedding dimension (384) matches text-embedding-3-small model
-- If using a different model, adjust the vector size:
--   text-embedding-3-large: vector(1536)
--   text-embedding-ada-002: vector(1536)
--   nomic-embed-text: vector(768)
--   bge-small-en-v1.5: vector(384)
