# Deployment Guide (Supabase + Frontend Hosting)

## 1. Supabase Setup

1. Create a Supabase project and link the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
2. Apply all SQL migrations in order:
   ```bash
   npx supabase db push
   ```
   This applies:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_storage_setup.sql`
   - `004_media_expiry.sql`
   - `005_reward_functions.sql`

3. Set Edge Function secrets (never commit to git):
   ```bash
   npx supabase secrets set \
     GEMINI_API_KEY=<your-gemini-key> \
     GEMINI_MODEL=gemini-2.5-flash \
     PURGE_ALERT_WEBHOOK_URL=<optional-webhook>
   ```

4. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy companion-dialogue
   npx supabase functions deploy analyze-object
   npx supabase functions deploy transcribe-audio
   npx supabase functions deploy complete-quest
   npx supabase functions deploy purge-expired-media --no-verify-jwt
   ```

5. Verify `pg_cron` schedule (or Supabase Scheduled Functions):
   - `004_media_expiry.sql` registers a 5-minute cron (`*/5 * * * *`) calling `purge-expired-media` with the service-role header, or you can attach a Supabase Scheduled Trigger / external cron calling the `purge-expired-media` function with a shared cron secret (`x-purge-secret`).

---

## 2. Storage Lifecycle Secondary Safeguard

In Supabase Storage dashboard for bucket `ephemeral-media`, optionally add a secondary S3 lifecycle rule to expire objects at 2 days. Remember: **Phygital does not rely on storage lifecycle alone**—database RLS (`expires_at > NOW()`) enforces exact 48-hour access denial and `purge-expired-media` performs physical deletion every 5 minutes.

---

## 3. Frontend Deployment (Vercel / Netlify / Cloudflare Pages)

1. Build command: `npm run build`
2. Output directory: `dist`
3. Environment variables on hosting platform:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (pointing to your deployed Supabase Functions URL or Node API origin)
4. Ensure HTTPS is enabled in production (required for `navigator.mediaDevices.getUserMedia` camera & microphone permissions and PWA Service Worker registration).
