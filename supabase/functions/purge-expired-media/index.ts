// Supabase Edge Function: purge-expired-media
// Scheduled every 5 minutes via pg_cron or Supabase Scheduled Functions.
// Enforces physical deletion of expired media objects + metadata without PII logging.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const BATCH_SIZE = 50;
const MAX_RETRIES = 2;

async function deleteStorageWithRetry(
  supabaseAdmin: ReturnType<typeof createClient>,
  path: string
): Promise<'deleted' | 'already_absent' | 'failed'> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await supabaseAdmin.storage.from('ephemeral-media').remove([path]);
    if (!error) return 'deleted';
    const msg = error.message.toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      return 'already_absent';
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  return 'failed';
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('PURGE_CRON_SECRET');
  const providedSecret = req.headers.get('x-purge-secret');
  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const { data: expiredRows, error: fetchErr } = await supabaseAdmin
    .from('ephemeral_media_vault')
    .select('id, storage_bucket_path')
    .lte('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    await supabaseAdmin.from('media_purge_audit').insert({
      expired_found: 0,
      storage_deleted: 0,
      metadata_deleted: 0,
      failure_count: 1,
      status: 'failed',
      error_summary: 'Failed querying expired vault records',
    });
    return new Response(JSON.stringify({ error: 'Query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = expiredRows ?? [];
  let storageDeleted = 0;
  let metadataDeleted = 0;
  let failureCount = 0;

  // Handle partial batch failures cleanly: only delete metadata once binary is confirmed removed/absent
  for (const row of rows) {
    const outcome = await deleteStorageWithRetry(supabaseAdmin, row.storage_bucket_path);
    if (outcome === 'failed') {
      failureCount++;
      continue;
    }
    storageDeleted++;

    const { error: delErr } = await supabaseAdmin
      .from('ephemeral_media_vault')
      .delete()
      .eq('id', row.id);

    if (delErr) {
      failureCount++;
    } else {
      metadataDeleted++;
    }
  }

  const status = failureCount === 0 ? 'ok' : metadataDeleted > 0 ? 'partial_failure' : 'failed';

  // Log ONLY aggregate counts (zero child-identifying information)
  await supabaseAdmin.from('media_purge_audit').insert({
    expired_found: rows.length,
    storage_deleted: storageDeleted,
    metadata_deleted: metadataDeleted,
    failure_count: failureCount,
    status,
    error_summary: failureCount > 0 ? `${failureCount} items failed during batch purge` : null,
  });

  // Alert administrators if failures persist
  const alertWebhook = Deno.env.get('PURGE_ALERT_WEBHOOK_URL');
  if (failureCount > 0 && alertWebhook) {
    await fetch(alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'phygital-purge-expired-media',
        status,
        expired_found: rows.length,
        failure_count: failureCount,
        timestamp: nowIso,
      }),
    }).catch(() => {});
  }

  return new Response(
    JSON.stringify({
      expired_found: rows.length,
      storage_deleted: storageDeleted,
      metadata_deleted: metadataDeleted,
      failure_count: failureCount,
      status,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
