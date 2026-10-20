
CREATE POLICY "needup media readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('avatars','post-images'));
CREATE POLICY "needup upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','post-images') AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif'));
CREATE POLICY "needup update own files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','post-images') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "needup delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','post-images') AND (storage.foldername(name))[1] = auth.uid()::text);
