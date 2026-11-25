-- ============================================================================
-- 003_storage_setup.sql
-- Private ephemeral media storage bucket with strict MIME & size restrictions
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ephemeral-media',
  'ephemeral-media',
  false,
  10485760, -- 10 MB strict limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path convention: <parent_uid>/<child_id>/<uuid>.<ext>
-- Only authenticated parents may upload into their own prefix.
CREATE POLICY "Parents upload own ephemeral child media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ephemeral-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Direct client downloads are blocked unless handled via short-lived signed URLs
-- minted by server functions that verify expires_at > NOW().
-- Service role retains full access for 5-minute purge worker deletion.
CREATE POLICY "Parents delete own ephemeral child media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ephemeral-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
