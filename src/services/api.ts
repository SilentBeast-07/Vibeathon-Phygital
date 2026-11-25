import type {
  AgeGroup,
  BadgeInfo,
  ChildPermissions,
  ChildProfile,
  CompanionDialogueResponse,
  DialogueTrigger,
  EphemeralMediaRecord,
  MemoryCard,
  ObjectScanResponse,
  OfflineMissionSession,
  ParentAccount,
  ParentQuest,
  PreferredLanguage,
  PurgeAuditEntry,
  QuestCategory,
  QuestProgressItem,
  QuestZone,
} from '@/types/phygital';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

export class ApiError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
      ? window.localStorage.getItem('phygital_auth_token')
      : null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export interface DashboardBundle {
  child: ChildProfile;
  progress: QuestProgressItem[];
  parentQuests: ParentQuest[];
  badges: BadgeInfo[];
  memoryCards: MemoryCard[];
  activeOfflineMission: OfflineMissionSession | null;
  ephemeralMedia: EphemeralMediaRecord[];
  purgeAudits: PurgeAuditEntry[];
}

export const phygitalApi = {
  health: () =>
    apiFetch<{ ok: boolean; ai_mode: 'gemini' | 'development_mock'; gemini_model: string }>('/health'),

  registerParent: (body: {
    email: string;
    password: string;
    displayName: string;
    pin?: string;
  }) =>
    apiFetch<{ parent: ParentAccount; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  loginParent: (email: string, password: string) =>
    apiFetch<{ parent: ParentAccount; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<{ parent: ParentAccount; children: ChildProfile[] }>('/auth/me'),

  verifyPin: (pin: string) =>
    apiFetch<{ verified: boolean }>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  setPin: (pin: string) =>
    apiFetch<{ ok: boolean }>('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  createChild: (body: {
    nickname: string;
    ageGroup: AgeGroup;
    preferredLanguage: PreferredLanguage;
    permissions?: Partial<ChildPermissions>;
  }) =>
    apiFetch<{ child: ChildProfile }>('/children', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateChild: (
    childId: string,
    updates: {
      nickname?: string;
      age_group?: AgeGroup;
      preferred_language?: PreferredLanguage;
      permissions?: Partial<ChildPermissions>;
    }
  ) =>
    apiFetch<{ child: ChildProfile }>(`/children/${childId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteChild: (childId: string) =>
    apiFetch<{ deleted: boolean; deletedMediaFiles: number }>(`/children/${childId}`, {
      method: 'DELETE',
    }),

  getChildDashboard: (childId: string) =>
    apiFetch<DashboardBundle>(`/children/${childId}/dashboard`),

  addParentQuest: (body: {
    childId: string;
    title: string;
    description: string;
    rewardXp: number;
    ageSuitability: 'all' | AgeGroup;
    dueAt: string | null;
  }) =>
    apiFetch<{ quest: ParentQuest }>('/parent-quests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  companionDialogue: (body: {
    childId: string;
    trigger: DialogueTrigger;
    ageGroup: AgeGroup;
    language: PreferredLanguage;
    questTitle?: string;
    userMessage?: string;
    context?: Record<string, unknown>;
  }) =>
    apiFetch<CompanionDialogueResponse>('/companion-dialogue', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  analyzeObject: (body: {
    childId: string;
    imageBase64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    ageGroup: AgeGroup;
    language: PreferredLanguage;
    sceneHint?: string;
    saveEphemeral?: boolean;
  }) =>
    apiFetch<{ analysis: ObjectScanResponse; ephemeralMedia: EphemeralMediaRecord | null }>(
      '/analyze-object',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  transcribeAudio: (body: {
    childId: string;
    audioBase64: string;
    mimeType: 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'audio/wav';
    language: PreferredLanguage;
    fallbackText?: string;
    saveEphemeral?: boolean;
  }) =>
    apiFetch<{
      transcript: string;
      detected_language: PreferredLanguage;
      mode: 'gemini' | 'development_mock';
      ephemeralMedia: EphemeralMediaRecord | null;
    }>('/transcribe-audio', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  saveVoiceCapsule: (body: {
    childId: string;
    adultConsentConfirmed: true;
    storyTopic: string;
    storySummary: string;
    audioBase64?: string;
    mimeType?: 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'audio/wav';
  }) =>
    apiFetch<{
      card: MemoryCard;
      ephemeralMedia: EphemeralMediaRecord | null;
      child: ChildProfile;
      awardedXp: number;
      unlockedBadge: string | null;
    }>('/voice-capsules', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  completeQuest: (body: {
    childId: string;
    questZone: QuestZone;
    questCode: string;
    questTitle: string;
    questCategory: QuestCategory;
    aiSummary?: string;
    parentQuestId?: string;
    badgeOverride?: string;
  }) =>
    apiFetch<{
      child: ChildProfile;
      progressItem: QuestProgressItem;
      awardedXp: number;
      unlockedBadge: string | null;
    }>('/complete-quest', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  startOfflineMission: (body: {
    childId: string;
    missionTitle: string;
    targetMinutes: 15 | 20 | 30;
  }) =>
    apiFetch<{ session: OfflineMissionSession }>('/offline-missions/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  completeOfflineMission: (body: { childId: string; missionId: string }) =>
    apiFetch<{
      session: OfflineMissionSession;
      child: ChildProfile;
      awardedXp: number;
      unlockedBadge: string | null;
    }>('/offline-missions/complete', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteEphemeralMedia: (mediaId: string) =>
    apiFetch<{ deleted: boolean }>(`/ephemeral-media/${mediaId}`, { method: 'DELETE' }),

  triggerPurgeWorker: () =>
    apiFetch<{ audit: PurgeAuditEntry }>('/purge-expired-media', { method: 'POST' }),
};
