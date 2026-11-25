-- ============================================================================
-- 004_media_expiry.sql
-- Strict 48-hour ephemeral media vault + tamper prevention + 5-min purge cron
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ephemeral_media_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  quest_id UUID,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  storage_bucket_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '48 hours') STORED
);

-- Required indexed expiry column for fast cutoff queries and 5-minute batch purges
CREATE INDEX IF NOT EXISTS idx_ephemeral_media_expires_at
  ON public.ephemeral_media_vault(expires_at);

CREATE INDEX IF NOT EXISTS idx_ephemeral_media_child_id
  ON public.ephemeral_media_vault(child_id);

ALTER TABLE public.ephemeral_media_vault ENABLE ROW LEVEL SECURITY;

-- Prevent clients from tampering with created_at or storage paths
CREATE OR REPLACE FUNCTION public.prevent_ephemeral_media_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable on ephemeral_media_vault';
  END IF;
  IF NEW.storage_bucket_path IS DISTINCT FROM OLD.storage_bucket_path THEN
    RAISE EXCEPTION 'storage_bucket_path is immutable on ephemeral_media_vault';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ephemeral_media_tampering ON public.ephemeral_media_vault;
CREATE TRIGGER trg_prevent_ephemeral_media_tampering
  BEFORE UPDATE ON public.ephemeral_media_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ephemeral_media_tampering();

-- Hard 48-hour cutoff at database RLS layer: expired records become immediately invisible
CREATE POLICY "Parents view active unexpired media metadata only"
  ON public.ephemeral_media_vault FOR SELECT
  TO authenticated
  USING (
    public.is_child_owner(child_id)
    AND expires_at > NOW()
  );

CREATE POLICY "Parents register new ephemeral media metadata"
  ON public.ephemeral_media_vault FOR INSERT
  TO authenticated
  WITH CHECK (public.is_child_owner(child_id));

CREATE POLICY "Parents delete own ephemeral media metadata"
  ON public.ephemeral_media_vault FOR DELETE
  TO authenticated
  USING (public.is_child_owner(child_id));

-- Optional pg_cron schedule for environments with pg_cron + pg_net enabled.
-- Invokes the purge-expired-media Edge Function every 5 minutes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.schedule(
      'phygital-purge-expired-media-5m',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/purge-expired-media',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-purge-secret', current_setting('app.settings.purge_cron_secret', true)
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped (enable pg_cron + pg_net or use Supabase Scheduled Functions): %', SQLERRM;
END $$;
