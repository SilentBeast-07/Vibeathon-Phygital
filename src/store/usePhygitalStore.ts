import { create } from 'zustand';
import type {
  BadgeInfo,
  ChildProfile,
  CompanionAnimation,
  DialogueTurn,
  EphemeralMediaRecord,
  MemoryCard,
  OfflineMissionSession,
  ParentAccount,
  ParentQuest,
  PurgeAuditEntry,
  QuestProgressItem,
} from '@/types/phygital';
import { phygitalApi } from '@/services/api';

interface PhygitalState {
  token: string | null;
  parent: ParentAccount | null;
  children: ChildProfile[];
  activeChildId: string | null;
  progress: QuestProgressItem[];
  parentQuests: ParentQuest[];
  badges: BadgeInfo[];
  memoryCards: MemoryCard[];
  activeOfflineMission: OfflineMissionSession | null;
  ephemeralMedia: EphemeralMediaRecord[];
  purgeAudits: PurgeAuditEntry[];
  aiMode: 'gemini' | 'development_mock';
  parentUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  companionAnimation: CompanionAnimation;
  companionTurns: DialogueTurn[];

  hydrateSession: () => Promise<void>;
  setSession: (parent: ParentAccount, token: string) => void;
  logout: () => void;
  selectChild: (childId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  setParentUnlocked: (unlocked: boolean) => void;
  setCompanionReaction: (animation: CompanionAnimation, turns: DialogueTurn[]) => void;
  clearError: () => void;
}

const DEFAULT_TURNS: DialogueTurn[] = [
  {
    character: 'leo',
    emotion: 'curious',
    text_en: 'Fascinating! Ready to discover something amazing in the real world?',
    text_bn: 'দারুণ! চলো আজ বাস্তব জগতে দারুণ কিছু আবিষ্কার করি!',
  },
  {
    character: 'maya',
    emotion: 'happy',
    text_en: "Come on! Let's check today's adventure together!",
    text_bn: 'এসো! আজকের অ্যাডভেঞ্চার একসাথে শুরু করি!',
  },
];

function readStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
      ? window.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors
  }
}

function removeStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.removeItem === 'function') {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

export const usePhygitalStore = create<PhygitalState>((set, get) => ({
  token: readStorage('phygital_auth_token'),
  parent: null,
  children: [],
  activeChildId: readStorage('phygital_active_child_id'),
  progress: [],
  parentQuests: [],
  badges: [],
  memoryCards: [],
  activeOfflineMission: null,
  ephemeralMedia: [],
  purgeAudits: [],
  aiMode: 'development_mock',
  parentUnlocked: false,
  isLoading: false,
  error: null,
  companionAnimation: 'idle',
  companionTurns: DEFAULT_TURNS,

  hydrateSession: async () => {
    const token = readStorage('phygital_auth_token');
    set({ isLoading: true, error: null });
    try {
      const health = await phygitalApi.health().catch(() => null);
      if (health) {
        set({ aiMode: health.ai_mode });
      }
      if (!token) {
        set({ isLoading: false, parent: null, children: [] });
        return;
      }
      const { parent, children } = await phygitalApi.me();
      const storedChild = readStorage('phygital_active_child_id');
      const targetChild =
        children.find((c) => c.id === storedChild)?.id ?? children[0]?.id ?? null;

      set({ parent, children, activeChildId: targetChild, token });
      if (targetChild) {
        writeStorage('phygital_active_child_id', targetChild);
        await get().refreshDashboard();
      }
    } catch {
      removeStorage('phygital_auth_token');
      removeStorage('phygital_active_child_id');
      set({ token: null, parent: null, children: [], activeChildId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  setSession: (parent, token) => {
    writeStorage('phygital_auth_token', token);
    set({ parent, token, parentUnlocked: false });
  },

  logout: () => {
    removeStorage('phygital_auth_token');
    removeStorage('phygital_active_child_id');
    set({
      token: null,
      parent: null,
      children: [],
      activeChildId: null,
      progress: [],
      parentQuests: [],
      badges: [],
      memoryCards: [],
      activeOfflineMission: null,
      ephemeralMedia: [],
      parentUnlocked: false,
    });
  },

  selectChild: async (childId) => {
    writeStorage('phygital_active_child_id', childId);
    set({ activeChildId: childId });
    await get().refreshDashboard();
  },

  refreshDashboard: async () => {
    const childId = get().activeChildId;
    if (!childId) return;
    try {
      const bundle = await phygitalApi.getChildDashboard(childId);
      set((state) => ({
        children: state.children.map((c) => (c.id === bundle.child.id ? bundle.child : c)),
        progress: bundle.progress,
        parentQuests: bundle.parentQuests,
        badges: bundle.badges,
        memoryCards: bundle.memoryCards,
        activeOfflineMission: bundle.activeOfflineMission,
        ephemeralMedia: bundle.ephemeralMedia,
        purgeAudits: bundle.purgeAudits,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setParentUnlocked: (unlocked) => set({ parentUnlocked: unlocked }),

  setCompanionReaction: (animation, turns) =>
    set({ companionAnimation: animation, companionTurns: turns }),

  clearError: () => set({ error: null }),
}));
