import type { PurgeAuditEntry } from '../src/types/phygital';
import type { LocalPhygitalStore } from './store';

export interface PurgeWorkerOptions {
  store: Pick<
    LocalPhygitalStore,
    'getExpiredVaultBatch' | 'removeStorageObject' | 'deleteVaultMetadataRow' | 'recordPurgeAudit'
  >;
  now?: Date;
  batchSize?: number;
  maxRetries?: number;
  storageRemover?: (storagePath: string) => Promise<'deleted' | 'already_absent'> | 'deleted' | 'already_absent';
  alertAdmin?: (summary: {
    expired_found: number;
    failure_count: number;
    status: string;
    timestamp: string;
  }) => Promise<void> | void;
}

/**
 * Automated 48-hour ephemeral media deletion worker.
 * - Idempotent: treats already-absent storage objects as safely deleted.
 * - Partial-failure safe: deletes metadata ONLY once binary deletion/absence is confirmed.
 * - Privacy-preserving: logs ONLY aggregate counts, never child-identifying information.
 */
export async function purgeExpiredMedia(options: PurgeWorkerOptions): Promise<PurgeAuditEntry> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const batchSize = options.batchSize ?? 50;
  const maxRetries = options.maxRetries ?? 2;
  const remover = options.storageRemover ?? ((p: string) => options.store.removeStorageObject(p));

  const expiredRows = options.store.getExpiredVaultBatch(nowIso, batchSize);
  let storageDeleted = 0;
  let metadataDeleted = 0;
  let failureCount = 0;

  for (const row of expiredRows) {
    let binaryCleared = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const outcome = await remover(row.storage_bucket_path);
        if (outcome === 'deleted' || outcome === 'already_absent') {
          binaryCleared = true;
          break;
        }
      } catch {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
        }
      }
    }

    if (!binaryCleared) {
      failureCount++;
      continue;
    }

    storageDeleted++;
    try {
      options.store.deleteVaultMetadataRow(row.id);
      metadataDeleted++;
    } catch {
      failureCount++;
    }
  }

  const status: PurgeAuditEntry['status'] =
    failureCount === 0 ? 'ok' : metadataDeleted > 0 ? 'partial_failure' : 'failed';

  const audit = options.store.recordPurgeAudit({
    ran_at: nowIso,
    expired_found: expiredRows.length,
    storage_deleted: storageDeleted,
    metadata_deleted: metadataDeleted,
    failure_count: failureCount,
    status,
    error_summary: failureCount > 0 ? `${failureCount} expired item(s) could not be purged` : null,
  });

  if (failureCount > 0 && options.alertAdmin) {
    await options.alertAdmin({
      expired_found: expiredRows.length,
      failure_count: failureCount,
      status,
      timestamp: nowIso,
    });
  }

  return audit;
}
