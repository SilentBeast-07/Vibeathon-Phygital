import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPhygitalApp } from '../../server/index';
import { purgeExpiredMedia } from '../../server/purgeWorker';
import type { LocalPhygitalStore } from '../../server/store';

let server: http.Server;
let baseUrl: string;
let tempDir: string;
let storeRef: LocalPhygitalStore;

async function jsonReq<T>(
  route: string,
  options: { method?: string; token?: string; body?: unknown } = {}
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
}

describe('Phygital Backend, Auth, Offline Battery & 48h Privacy Integration', () => {
  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phygital-test-'));
    const { app, store } = createPhygitalApp({ dataDir: tempDir });
    storeRef = store;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('registers parent, enforces PIN & ownership isolation, awards XP, and handles 48h media expiry + purge', async () => {
    // 1. Register Parent A
    const regA = await jsonReq<{ parent: { id: string }; token: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'parentA@example.com',
        password: 'securePassword1',
        displayName: 'Ananya',
        pin: '2580',
      },
    });
    expect(regA.status).toBe(201);
    const tokenA = regA.data.token;

    // 2. Verify PIN gate
    const badPin = await jsonReq('/api/auth/verify-pin', {
      method: 'POST',
      token: tokenA,
      body: { pin: '9999' },
    });
    expect(badPin.status).toBe(403);

    const goodPin = await jsonReq<{ verified: boolean }>('/api/auth/verify-pin', {
      method: 'POST',
      token: tokenA,
      body: { pin: '2580' },
    });
    expect(goodPin.status).toBe(200);
    expect(goodPin.data.verified).toBe(true);

    // 3. Create Child Profile
    const childRes = await jsonReq<{ child: { id: string; nickname: string } }>('/api/children', {
      method: 'POST',
      token: tokenA,
      body: {
        nickname: 'Starfinder',
        ageGroup: 'curious',
        preferredLanguage: 'bilingual',
        permissions: { camera_enabled: true, microphone_enabled: true },
      },
    });
    expect(childRes.status).toBe(201);
    const childId = childRes.data.child.id;

    // 4. Register Parent B and confirm Parent B CANNOT access Parent A's child
    const regB = await jsonReq<{ token: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'parentB@example.com',
        password: 'securePassword2',
        displayName: 'Rahim',
      },
    });
    const unauthDash = await jsonReq(`/api/children/${childId}/dashboard`, {
      token: regB.data.token,
    });
    expect(unauthDash.status).toBe(404);

    // 5. Complete quest and verify XP + badge persist
    const questRes = await jsonReq<{
      child: { total_xp: number; level: number };
      awardedXp: number;
      unlockedBadge: string;
    }>('/api/complete-quest', {
      method: 'POST',
      token: tokenA,
      body: {
        childId,
        questZone: 'potion_gadget_lab',
        questCode: 'lab_salt_dissolve',
        questTitle: 'The Disappearing Salt Mystery',
        questCategory: 'discovery',
      },
    });
    expect(questRes.status).toBe(200);
    expect(questRes.data.awardedXp).toBe(20);
    expect(questRes.data.unlockedBadge).toBe('mini_scientist');

    // 6. Reverse tutoring dialogue & voice capsule consent validation
    const dialogueRes = await jsonReq<{ quest_completed: boolean; xp_awarded: number }>(
      '/api/companion-dialogue',
      {
        method: 'POST',
        token: tokenA,
        body: {
          childId,
          trigger: 'reverse_tutoring',
          ageGroup: 'curious',
          language: 'bilingual',
          questTitle: 'Why does it rain?',
          userMessage: 'Sun warms water into vapor, it cools into clouds, and falls as rain.',
        },
      }
    );
    expect(dialogueRes.status).toBe(200);
    expect(dialogueRes.data.quest_completed).toBe(true);
    expect(dialogueRes.data.xp_awarded).toBe(25);

    const noConsentCapsule = await jsonReq('/api/voice-capsules', {
      method: 'POST',
      token: tokenA,
      body: {
        childId,
        adultConsentConfirmed: false,
        storyTopic: 'Childhood games',
        storySummary: 'Played kanamachi in the courtyard.',
      },
    });
    expect(noConsentCapsule.status).toBe(400);

    // 7. Ephemeral Media 48-Hour Access Cutoff & Purge Worker
    const activeMedia = storeRef.storeEphemeralMedia({
      parentId: regA.data.parent.id,
      childId,
      questId: null,
      mediaType: 'image',
      mimeType: 'image/png',
      buffer: Buffer.from('active-photo-bytes'),
    });

    const activeFetch = await fetch(`${baseUrl}/api/ephemeral-media/file/${activeMedia.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(activeFetch.status).toBe(200);

    // Create an expired media record (49 hours old)
    const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000);
    const expiredMedia = storeRef.storeEphemeralMedia({
      parentId: regA.data.parent.id,
      childId,
      questId: null,
      mediaType: 'audio',
      mimeType: 'audio/webm',
      buffer: Buffer.from('expired-audio-bytes'),
      createdAtOverride: fortyNineHoursAgo,
    });

    // Access MUST be denied immediately after 48h
    const expiredFetch = await fetch(`${baseUrl}/api/ephemeral-media/file/${expiredMedia.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(expiredFetch.status).toBe(410);

    // Test partial batch failure handling + alert hook on purgeExpiredMedia
    const alertSpy = vi.fn();
    let callCount = 0;
    const partialAudit = await purgeExpiredMedia({
      store: storeRef,
      alertAdmin: alertSpy,
      maxRetries: 0,
      storageRemover: () => {
        callCount++;
        if (callCount === 1) throw new Error('Simulated transient storage outage');
        return 'deleted';
      },
    });
    expect(partialAudit.expired_found).toBe(1);
    expect(partialAudit.failure_count).toBe(1);
    expect(partialAudit.status).toBe('failed');
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // Retry purge cleanly: expired file & metadata removed, active file untouched
    const cleanAudit = await purgeExpiredMedia({ store: storeRef });
    expect(cleanAudit.expired_found).toBe(1);
    expect(cleanAudit.storage_deleted).toBe(1);
    expect(cleanAudit.metadata_deleted).toBe(1);
    expect(cleanAudit.failure_count).toBe(0);
    expect(JSON.stringify(cleanAudit)).not.toContain('Starfinder'); // No PII in audit logs

    const stillActive = await fetch(`${baseUrl}/api/ephemeral-media/file/${activeMedia.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(stillActive.status).toBe(200);

    // 8. Offline Sun-Battery timestamp validation
    const startOffline = await jsonReq<{ session: { id: string } }>('/api/offline-missions/start', {
      method: 'POST',
      token: tokenA,
      body: { childId, missionTitle: 'Cozy Storybook Reading', targetMinutes: 20 },
    });
    expect(startOffline.status).toBe(201);

    // Immediate completion must be rejected
    const tooEarly = await jsonReq('/api/offline-missions/complete', {
      method: 'POST',
      token: tokenA,
      body: { childId, missionId: startOffline.data.session.id },
    });
    expect(tooEarly.status).toBe(400);

    // Simulate 21 minutes elapsed via server timestamp
    const completedOffline = storeRef.completeOfflineMission(
      regA.data.parent.id,
      childId,
      startOffline.data.session.id,
      Date.now() + 21 * 60_000
    );
    expect(completedOffline.child.sun_battery_level).toBe(70); // 40 starter + 30 awarded
    expect(completedOffline.unlockedBadge).toBe('screen_free_champion');

    // 9. Parent Delete Child Data cascades cleanly
    const delRes = await jsonReq<{ deleted: boolean; deletedMediaFiles: number }>(
      `/api/children/${childId}`,
      { method: 'DELETE', token: tokenA }
    );
    expect(delRes.status).toBe(200);
    expect(delRes.data.deleted).toBe(true);
    expect(delRes.data.deletedMediaFiles).toBe(1);
  });
});
