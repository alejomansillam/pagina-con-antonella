CREATE POLICY gallery_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gallery');
CREATE POLICY gallery_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');
CREATE POLICY gallery_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery');