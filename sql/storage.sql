-- Storage Buckets setup for TipMix AI
-- Execute these in Supabase SQL Editor after creating the buckets in the UI

-- Create storage buckets via Supabase UI:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket: "raw-html" (public: false)
-- 3. Create bucket: "raw-json" (public: false)

-- Storage policies for raw-html bucket
CREATE POLICY "Public can read raw-html"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'raw-html');

CREATE POLICY "Service can insert raw-html"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'raw-html');

CREATE POLICY "Service can update raw-html"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'raw-html');

CREATE POLICY "Service can delete raw-html"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'raw-html');

-- Storage policies for raw-json bucket
CREATE POLICY "Public can read raw-json"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'raw-json');

CREATE POLICY "Service can insert raw-json"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'raw-json');

CREATE POLICY "Service can update raw-json"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'raw-json');

CREATE POLICY "Service can delete raw-json"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'raw-json');
