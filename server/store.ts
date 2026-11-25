import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AgeGroup,
  BadgeInfo,
  ChildPermissions,
  ChildProfile,
  EphemeralMediaRecord,
  MemoryCard,
  OfflineMissionSession,
  ParentAccount,
  ParentQuest,
  PreferredLanguage,
  PurgeAuditEntry,
  QuestProgressItem,
  QuestZone,
} from '../src/types/phygital';
import { BADGE_CATALOG } from '../src/features/quests/questCatalog';

export interface StoredParent extends ParentAccount {
  password_hash: string;
  pin_hash: string | null;
}

export interface StoredMediaRow {
  id: string;
  child_id: string;
  quest_id: string | null;
  media_type: 'image' | 'audio' | 'video';
  mime_type: string;
  size_bytes: number;
  storage_bucket_path: string;
  created_at: string;
  expires_at: string;
}

export interface StoredChildBadge {
  child_id: string;
  badge_code: string;
  unlocked_at: string;
}

export interface DatabaseState {
  parents: StoredParent[];
  sessions: Record<string, string>; // token -> parentId
  children: ChildProfile[];
  quest_progress: QuestProgressItem[];
  parent_quests: ParentQuest[];
  child_badges: StoredChildBadge[];
  memory_cards: MemoryCard[];
  offline_missions: OfflineMissionSession[];
  ephemeral_media_vault: StoredMediaRow[];
  media_purge_audit: PurgeAuditEntry[];
}

export const RETENTION_MS = 48 * 60 * 60 * 1000;

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(secret, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1);
}

export class LocalPhygitalStore {
  private readonly dbPath: string;
  public readonly mediaDir: string;
  private state: DatabaseState;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.dbPath = path.join(dataDir, 'phygital-db.json');
    this.mediaDir = path.join(dataDir, 'ephemeral-media');
    fs.mkdirSync(this.mediaDir, { recursive: true });
    this.state = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseState {
    if (fs.existsSync(this.dbPath)) {
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(raw) as DatabaseState;
    }
    const empty: DatabaseState = {
      parents: [],
      sessions: {},
      children: [],
      quest_progress: [],
      parent_quests: [],
      child_badges: [],
      memory_cards: [],
      offline_missions: [],
      ephemeral_media_vault: [],
      media_purge_audit: [],
    };
    this.saveState(empty);
    return empty;
  }

  private saveState(next: DatabaseState = this.state): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(next, null, 2), 'utf8');
  }

  public registerParent(input: {
    email: string;
    password: string;
    displayName: string;
    pin?: string;
  }): { parent: ParentAccount; token: string } {
    const emailNorm = input.email.trim().toLowerCase();
    if (this.state.parents.some((p) => p.email === emailNorm)) {
      throw new Error('An account with this email already exists.');
    }
    const parent: StoredParent = {
      id: crypto.randomUUID(),
      email: emailNorm,
      display_name: input.displayName.trim(),
      has_pin: Boolean(input.pin),
      password_hash: hashSecret(input.password),
      pin_hash: input.pin ? hashSecret(input.pin) : null,
    };
    this.state.parents.push(parent);
    const token = crypto.randomBytes(24).toString('hex');
    this.state.sessions[token] = parent.id;
    this.saveState();
    return {
      parent: {
        id: parent.id,
        email: parent.email,
        display_name: parent.display_name,
        has_pin: parent.has_pin,
      },
      token,
    };
  }

  public loginParent(email: string, password: string): { parent: ParentAccount; token: string } {
    const emailNorm = email.trim().toLowerCase();
    const found = this.state.parents.find((p) => p.email === emailNorm);
    if (!found || !verifySecret(password, found.password_hash)) {
      throw new Error('Invalid email or password.');
    }
    const token = crypto.randomBytes(24).toString('hex');
    this.state.sessions[token] = found.id;
    this.saveState();
    return {
      parent: {
        id: found.id,
        email: found.email,
        display_name: found.display_name,
        has_pin: found.has_pin,
      },
      token,
    };
  }

  public getParentByToken(token: string | undefined): StoredParent | null {
    if (!token) return null;
    const parentId = this.state.sessions[token];
    if (!parentId) return null;
    return this.state.parents.find((p) => p.id === parentId) ?? null;
  }

  public verifyParentPin(parentId: string, pin: string): boolean {
    const parent = this.state.parents.find((p) => p.id === parentId);
    if (!parent) return false;
    if (!parent.pin_hash) return true;
    return verifySecret(pin, parent.pin_hash);
  }

  public setParentPin(parentId: string, pin: string): void {
    const parent = this.state.parents.find((p) => p.id === parentId);
    if (!parent) throw new Error('Parent not found');
    parent.pin_hash = hashSecret(pin);
    parent.has_pin = true;
    this.saveState();
  }

  public listChildren(parentId: string): ChildProfile[] {
    return this.state.children.filter((c) => c.parent_id === parentId);
  }

  public getOwnedChild(parentId: string, childId: string): ChildProfile | null {
    return this.state.children.find((c) => c.id === childId && c.parent_id === parentId) ?? null;
  }

  public createChild(
    parentId: string,
    input: {
      nickname: string;
      ageGroup: AgeGroup;
      preferredLanguage: PreferredLanguage;
      permissions: Partial<ChildPermissions>;
    }
  ): ChildProfile {
    const child: ChildProfile = {
      id: crypto.randomUUID(),
      parent_id: parentId,
      nickname: input.nickname.trim(),
      age_group: input.ageGroup,
      preferred_language: input.preferredLanguage,
      total_xp: 0,
      level: 1,
      sun_battery_level: 40,
      permissions: {
        camera_enabled: input.permissions.camera_enabled ?? false,
        microphone_enabled: input.permissions.microphone_enabled ?? false,
        ai_companion_enabled: input.permissions.ai_companion_enabled ?? true,
        voice_capsules_enabled: input.permissions.voice_capsules_enabled ?? true,
        low_power_2d_mode: input.permissions.low_power_2d_mode ?? false,
      },
      created_at: new Date().toISOString(),
    };
    this.state.children.push(child);

    // Seed two starter parent quests to demonstrate parent-assigned missions immediately
    this.state.parent_quests.push(
      {
        id: crypto.randomUUID(),
        child_id: child.id,
        title: 'Read a storybook for 20 minutes',
        description: 'Pick any cozy physical book and read away from screens.',
        reward_xp: 20,
        age_suitability: child.age_group,
        due_at: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        child_id: child.id,
        title: 'Water a home plant & check its leaves',
        description: 'Touch the soil gently first to see if it feels dry.',
        reward_xp: 15,
        age_suitability: child.age_group,
        due_at: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    );

    this.saveState();
    return child;
  }

  public updateChild(
    parentId: string,
    childId: string,
    updates: {
      nickname?: string;
      age_group?: AgeGroup;
      preferred_language?: PreferredLanguage;
      permissions?: Partial<ChildPermissions>;
    }
  ): ChildProfile {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    if (updates.nickname) child.nickname = updates.nickname.trim();
    if (updates.age_group) child.age_group = updates.age_group;
    if (updates.preferred_language) child.preferred_language = updates.preferred_language;
    if (updates.permissions) {
      child.permissions = { ...child.permissions, ...updates.permissions };
    }
    this.saveState();
    return child;
  }

  public deleteChildAndAllData(parentId: string, childId: string): { deletedMediaFiles: number } {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');

    const childMedia = this.state.ephemeral_media_vault.filter((m) => m.child_id === childId);
    let deletedMediaFiles = 0;
    for (const media of childMedia) {
      const fullPath = path.join(this.mediaDir, media.storage_bucket_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        deletedMediaFiles++;
      }
    }

    this.state.ephemeral_media_vault = this.state.ephemeral_media_vault.filter(
      (m) => m.child_id !== childId
    );
    this.state.quest_progress = this.state.quest_progress.filter((q) => q.child_id !== childId);
    this.state.parent_quests = this.state.parent_quests.filter((q) => q.child_id !== childId);
    this.state.child_badges = this.state.child_badges.filter((b) => b.child_id !== childId);
    this.state.memory_cards = this.state.memory_cards.filter((m) => m.child_id !== childId);
    this.state.offline_missions = this.state.offline_missions.filter((o) => o.child_id !== childId);
    this.state.children = this.state.children.filter((c) => c.id !== childId);
    this.saveState();
    return { deletedMediaFiles };
  }

  public getChildDashboardData(parentId: string, childId: string) {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    const progress = this.state.quest_progress
      .filter((q) => q.child_id === childId)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    const parentQuests = this.state.parent_quests
      .filter((q) => q.child_id === childId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const unlockedMap = new Map(
      this.state.child_badges
        .filter((b) => b.child_id === childId)
        .map((b) => [b.badge_code, b.unlocked_at])
    );
    const badges: BadgeInfo[] = BADGE_CATALOG.map((b) => ({
      ...b,
      unlocked_at: unlockedMap.get(b.badge_code),
    }));
    const memoryCards = this.state.memory_cards
      .filter((m) => m.child_id === childId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const activeOfflineMission =
      this.state.offline_missions.find((m) => m.child_id === childId && m.status === 'active') ?? null;

    return {
      child,
      progress,
      parentQuests,
      badges,
      memoryCards,
      activeOfflineMission,
    };
  }

  public awardQuestCompletion(input: {
    parentId: string;
    childId: string;
    questZone: QuestZone;
    questCode: string;
    questTitle: string;
    awardedXp: number;
    aiSummary: string;
    badgeCode?: string;
    parentQuestId?: string;
    sunBatteryDelta?: number;
  }) {
    const child = this.getOwnedChild(input.parentId, input.childId);
    if (!child) throw new Error('Child profile not found');

    const safeXp = Math.min(Math.max(Math.round(input.awardedXp), 10), 30);
    child.total_xp += safeXp;
    child.level = computeLevel(child.total_xp);
    if (input.sunBatteryDelta) {
      child.sun_battery_level = Math.min(100, Math.max(0, child.sun_battery_level + input.sunBatteryDelta));
    }

    const progressItem: QuestProgressItem = {
      id: crypto.randomUUID(),
      child_id: child.id,
      quest_zone: input.questZone,
      quest_code: input.questCode,
      quest_title: input.questTitle,
      status: 'completed',
      ai_evaluation_summary: input.aiSummary,
      xp_awarded: safeXp,
      completed_at: new Date().toISOString(),
    };
    this.state.quest_progress.push(progressItem);

    if (input.parentQuestId) {
      const pq = this.state.parent_quests.find(
        (q) => q.id === input.parentQuestId && q.child_id === child.id
      );
      if (pq) pq.status = 'completed';
    }

    let unlockedBadge: string | null = null;
    if (input.badgeCode) {
      const exists = this.state.child_badges.some(
        (b) => b.child_id === child.id && b.badge_code === input.badgeCode
      );
      if (!exists) {
        this.state.child_badges.push({
          child_id: child.id,
          badge_code: input.badgeCode,
          unlocked_at: new Date().toISOString(),
        });
        unlockedBadge = input.badgeCode;
      }
    }

    this.saveState();
    return {
      child,
      progressItem,
      awardedXp: safeXp,
      unlockedBadge,
    };
  }

  public addParentQuest(
    parentId: string,
    childId: string,
    input: {
      title: string;
      description: string;
      rewardXp: number;
      ageSuitability: 'all' | AgeGroup;
      dueAt: string | null;
    }
  ): ParentQuest {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    const quest: ParentQuest = {
      id: crypto.randomUUID(),
      child_id: childId,
      title: input.title.trim(),
      description: input.description.trim(),
      reward_xp: Math.min(Math.max(input.rewardXp, 5), 30),
      age_suitability: input.ageSuitability,
      due_at: input.dueAt,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.state.parent_quests.push(quest);
    this.saveState();
    return quest;
  }

  public addMemoryCard(
    parentId: string,
    childId: string,
    card: Omit<MemoryCard, 'id' | 'child_id' | 'created_at'>
  ): MemoryCard {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    const full: MemoryCard = {
      ...card,
      id: crypto.randomUUID(),
      child_id: childId,
      created_at: new Date().toISOString(),
    };
    this.state.memory_cards.push(full);
    this.saveState();
    return full;
  }

  public startOfflineMission(
    parentId: string,
    childId: string,
    missionTitle: string,
    targetMinutes: 15 | 20 | 30
  ): OfflineMissionSession {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    // Cancel previous uncompleted active mission if child switches
    for (const m of this.state.offline_missions) {
      if (m.child_id === childId && m.status === 'active') {
        m.status = 'cancelled';
      }
    }
    const session: OfflineMissionSession = {
      id: crypto.randomUUID(),
      child_id: childId,
      mission_title: missionTitle,
      target_minutes: targetMinutes,
      started_at: new Date().toISOString(),
      completed_at: null,
      energy_awarded: 0,
      status: 'active',
    };
    this.state.offline_missions.push(session);
    this.saveState();
    return session;
  }

  public completeOfflineMission(
    parentId: string,
    childId: string,
    missionId: string,
    nowMs: number = Date.now()
  ) {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    const session = this.state.offline_missions.find(
      (m) => m.id === missionId && m.child_id === childId && m.status === 'active'
    );
    if (!session) throw new Error('Active offline mission not found');

    const elapsedMs = Math.max(0, nowMs - Date.parse(session.started_at));
    const elapsedMinutes = elapsedMs / 60_000;
    if (elapsedMinutes < session.target_minutes) {
      throw new Error(
        `Offline mission still needs ${Math.ceil(session.target_minutes - elapsedMinutes)} more minute(s) away from screen.`
      );
    }

    const energyAwarded = session.target_minutes === 30 ? 40 : session.target_minutes === 20 ? 30 : 20;
    session.completed_at = new Date(nowMs).toISOString();
    session.energy_awarded = energyAwarded;
    session.status = 'completed';

    const reward = this.awardQuestCompletion({
      parentId,
      childId,
      questZone: 'offline_battery',
      questCode: `offline_${session.target_minutes}m`,
      questTitle: session.mission_title,
      awardedXp: 30,
      aiSummary: `Completed ${session.target_minutes}-minute screen-free adventure.`,
      badgeCode: 'screen_free_champion',
      sunBatteryDelta: energyAwarded,
    });

    return { session, elapsedMinutes, ...reward };
  }

  // --- Ephemeral Media Vault (Strict 48-hour cutoff) ---

  public storeEphemeralMedia(input: {
    parentId: string;
    childId: string;
    questId: string | null;
    mediaType: 'image' | 'audio' | 'video';
    mimeType: string;
    buffer: Buffer;
    createdAtOverride?: Date; // used in automated expiry tests only on server side
  }): EphemeralMediaRecord {
    const child = this.getOwnedChild(input.parentId, input.childId);
    if (!child) throw new Error('Child profile not found');

    const id = crypto.randomUUID();
    const ext = input.mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
    const relPath = `${input.parentId}/${input.childId}/${id}.${ext}`;
    const fullPath = path.join(this.mediaDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, input.buffer);

    const created = input.createdAtOverride ?? new Date();
    const expires = new Date(created.getTime() + RETENTION_MS);

    const row: StoredMediaRow = {
      id,
      child_id: input.childId,
      quest_id: input.questId,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      size_bytes: input.buffer.length,
      storage_bucket_path: relPath,
      created_at: created.toISOString(),
      expires_at: expires.toISOString(),
    };
    this.state.ephemeral_media_vault.push(row);
    this.saveState();
    return this.toPublicMediaRecord(row);
  }

  private toPublicMediaRecord(row: StoredMediaRow, nowMs: number = Date.now()): EphemeralMediaRecord {
    const expMs = Date.parse(row.expires_at);
    const remaining = Math.max(0, Math.floor((expMs - nowMs) / 1000));
    return {
      id: row.id,
      child_id: row.child_id,
      quest_id: row.quest_id,
      media_type: row.media_type,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      created_at: row.created_at,
      expires_at: row.expires_at,
      remaining_seconds: remaining,
      is_expired: nowMs >= expMs,
    };
  }

  public listChildEphemeralMedia(
    parentId: string,
    childId: string,
    nowMs: number = Date.now()
  ): EphemeralMediaRecord[] {
    const child = this.getOwnedChild(parentId, childId);
    if (!child) throw new Error('Child profile not found');
    return this.state.ephemeral_media_vault
      .filter((m) => m.child_id === childId && Date.parse(m.expires_at) > nowMs)
      .map((m) => this.toPublicMediaRecord(m, nowMs))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public getEphemeralMediaFile(
    parentId: string,
    mediaId: string,
    nowMs: number = Date.now()
  ): { status: 'ok'; row: StoredMediaRow; buffer: Buffer } | { status: 'not_found' | 'forbidden' | 'expired' } {
    const row = this.state.ephemeral_media_vault.find((m) => m.id === mediaId);
    if (!row) return { status: 'not_found' };
    const child = this.getOwnedChild(parentId, row.child_id);
    if (!child) return { status: 'forbidden' };
    if (nowMs >= Date.parse(row.expires_at)) {
      return { status: 'expired' };
    }
    const fullPath = path.join(this.mediaDir, row.storage_bucket_path);
    if (!fs.existsSync(fullPath)) return { status: 'not_found' };
    return { status: 'ok', row, buffer: fs.readFileSync(fullPath) };
  }

  public deleteEphemeralMediaById(parentId: string, mediaId: string): boolean {
    const row = this.state.ephemeral_media_vault.find((m) => m.id === mediaId);
    if (!row) return false;
    const child = this.getOwnedChild(parentId, row.child_id);
    if (!child) throw new Error('Forbidden');
    const fullPath = path.join(this.mediaDir, row.storage_bucket_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    this.state.ephemeral_media_vault = this.state.ephemeral_media_vault.filter((m) => m.id !== mediaId);
    this.saveState();
    return true;
  }

  // --- Worker primitives (used exclusively by purgeExpiredMedia) ---

  public getExpiredVaultBatch(nowIso: string, limit: number = 50): StoredMediaRow[] {
    const nowMs = Date.parse(nowIso);
    return this.state.ephemeral_media_vault
      .filter((m) => Date.parse(m.expires_at) <= nowMs)
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at))
      .slice(0, limit);
  }

  public removeStorageObject(storagePath: string): 'deleted' | 'already_absent' {
    const fullPath = path.join(this.mediaDir, storagePath);
    if (!fs.existsSync(fullPath)) {
      return 'already_absent';
    }
    fs.unlinkSync(fullPath);
    return 'deleted';
  }

  public deleteVaultMetadataRow(mediaId: string): void {
    this.state.ephemeral_media_vault = this.state.ephemeral_media_vault.filter((m) => m.id !== mediaId);
    this.saveState();
  }

  public recordPurgeAudit(entry: Omit<PurgeAuditEntry, 'id'>): PurgeAuditEntry {
    const created: PurgeAuditEntry = {
      ...entry,
      id: (this.state.media_purge_audit[0]?.id ?? 0) + 1,
    };
    this.state.media_purge_audit.unshift(created);
    this.state.media_purge_audit = this.state.media_purge_audit.slice(0, 30);
    this.saveState();
    return created;
  }

  public getRecentPurgeAudits(): PurgeAuditEntry[] {
    return this.state.media_purge_audit;
  }
}
