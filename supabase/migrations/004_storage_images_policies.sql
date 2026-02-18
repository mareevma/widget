-- ============================================
-- Storage policies for images bucket
-- Fixes "new row violates row-level security policy"
-- when uploading files from admin panel.
-- ============================================

-- Ensure bucket exists (safe if it already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate policies idempotently
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete images" ON storage.objects;

-- Public can read files from images bucket
CREATE POLICY "Public read images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Authenticated admins can upload into images bucket
CREATE POLICY "Authenticated upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Authenticated admins can update files in images bucket
CREATE POLICY "Authenticated update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Authenticated admins can delete files in images bucket
CREATE POLICY "Authenticated delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images');
