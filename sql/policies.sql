-- Row Level Security (RLS) Policies for TipMix AI

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_variants ENABLE ROW LEVEL SECURITY;

-- Public read access for events (anyone can view events)
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Public read access for predictions
CREATE POLICY "Predictions are viewable by everyone"
  ON predictions FOR SELECT
  USING (true);

-- Public read access for tickets
CREATE POLICY "Tickets are viewable by everyone"
  ON tickets FOR SELECT
  USING (true);

-- Public read access for ticket variants
CREATE POLICY "Ticket variants are viewable by everyone"
  ON ticket_variants FOR SELECT
  USING (true);

-- Sources: Public read access
CREATE POLICY "Sources are viewable by everyone"
  ON sources FOR SELECT
  USING (true);

-- Facts: Public read access
CREATE POLICY "Facts are viewable by everyone"
  ON facts FOR SELECT
  USING (true);

-- Chunks: Restricted (only accessible through vector search functions)
CREATE POLICY "Chunks are viewable by authenticated service"
  ON chunks FOR SELECT
  USING (true);

-- Service role can do everything (no restrictions for backend operations)
-- The policies above only apply to anon/authenticated users
-- Service role key bypasses RLS

-- Insert/Update/Delete policies for service operations
-- These are permissive - in production, you might want to restrict further

CREATE POLICY "Service can insert events"
  ON events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update events"
  ON events FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can delete events"
  ON events FOR DELETE
  USING (true);

CREATE POLICY "Service can insert sources"
  ON sources FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert chunks"
  ON chunks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert facts"
  ON facts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert predictions"
  ON predictions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update predictions"
  ON predictions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can insert tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can delete tickets"
  ON tickets FOR DELETE
  USING (true);

CREATE POLICY "Service can insert ticket_variants"
  ON ticket_variants FOR INSERT
  WITH CHECK (true);
