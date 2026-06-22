
DROP POLICY IF EXISTS "Public read server images" ON storage.objects;
CREATE POLICY "Public read server images"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-images');

DROP POLICY IF EXISTS "Users can upload server images" ON storage.objects;
CREATE POLICY "Users can upload server images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'server-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own server images" ON storage.objects;
CREATE POLICY "Users can update own server images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'server-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own server images" ON storage.objects;
CREATE POLICY "Users can delete own server images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'server-images' AND (storage.foldername(name))[1] = auth.uid()::text);
