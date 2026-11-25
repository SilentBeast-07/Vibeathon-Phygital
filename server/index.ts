import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { z } from 'zod';
import { LocalPhygitalStore } from './store';
import {
  analyzeObjectImage,
  generateCompanionDialogue,
  SERVER_XP_BY_TRIGGER,
  transcribeChildAudio,
} from './gemini';
import { purgeExpiredMedia } from './purgeWorker';

const ZONE_BADGE_MAP: Record<string, string> = {
  potion_gadget_lab: 'mini_scientist',
  world_explorers_compass: 'nature_detective',
  time_travelers_attic: 'story_keeper',
  word_weavers_treehouse: 'bengali_word_wizard',
  daily_hero_training: 'everyday_hero',
  offline_battery: 'screen_free_champion',
};

const QUEST_XP_BY_CATEGORY: Record<string, number> = {
  simple: 10,
  discovery: 20,
  speaking: 25,
  family_story: 30,
  offline: 30,
  parent_habit: 15,
};

export function createPhygitalApp(options?: { dataDir?: string }) {
  const app = express();
  const dataDir = options?.dataDir ?? path.resolve(process.cwd(), 'server/.data');
  const store = new LocalPhygitalStore(dataDir);

  app.use(cors());
  app.use(express.json({ limit: '12mb' }));

  // Lightweight sliding-window rate limiter (120 req/min per IP)
  const hits = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const bucket = hits.get(ip);
    if (!bucket || now > bucket.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    bucket.count++;
    if (bucket.count > 180) {
      return res.status(429).json({ error: 'Too many requests. Take a short breather outside!' });
    }
    next();
  });

  function requireParent(req: Request, res: Response) {
    const auth = req.header('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : req.header('x-phygital-token');
    const parent = store.getParentByToken(token);
    if (!parent) {
      res.status(401).json({ error: 'Parent authentication required.' });
      return null;
    }
    return parent;
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      ai_mode: process.env.GEMINI_API_KEY ? 'gemini' : 'development_mock',
      gemini_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      retention_hours: 48,
    });
  });

  // --- Authentication ---
  app.post('/api/auth/register', (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6).max(100),
      displayName: z.string().min(2).max(40),
      pin: z.string().regex(/^\d{4}$/).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please enter a valid email, display name, and 6+ char password.' });
    }
    try {
      const result = store.registerParent(parsed.data);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(409).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
      const result = store.loginParent(parsed.data.email, parsed.data.password);
      return res.json(result);
    } catch (err) {
      return res.status(401).json({ error: (err as Error).message });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    res.json({
      parent: {
        id: parent.id,
        email: parent.email,
        display_name: parent.display_name,
        has_pin: parent.has_pin,
      },
      children: store.listChildren(parent.id),
    });
  });

  app.post('/api/auth/verify-pin', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({ pin: z.string().min(4).max(8) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid PIN format.' });
    const valid = store.verifyParentPin(parent.id, parsed.data.pin);
    if (!valid) return res.status(403).json({ error: 'Incorrect Parent PIN.' });
    res.json({ verified: true });
  });

  app.post('/api/auth/set-pin', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({ pin: z.string().regex(/^\d{4}$/) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'PIN must be 4 digits.' });
    store.setParentPin(parent.id, parsed.data.pin);
    res.json({ ok: true });
  });

  // --- Child Profiles ---
  app.get('/api/children', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    res.json({ children: store.listChildren(parent.id) });
  });

  app.post('/api/children', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      nickname: z.string().min(2).max(24),
      ageGroup: z.enum(['junior', 'curious', 'trailblazer']),
      preferredLanguage: z.enum(['en', 'bn', 'bilingual']),
      permissions: z
        .object({
          camera_enabled: z.boolean().optional(),
          microphone_enabled: z.boolean().optional(),
          ai_companion_enabled: z.boolean().optional(),
          voice_capsules_enabled: z.boolean().optional(),
          low_power_2d_mode: z.boolean().optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid child profile details.' });

    const child = store.createChild(parent.id, {
      ...parsed.data,
      permissions: parsed.data.permissions ?? {},
    });
    res.status(201).json({ child });
  });

  app.get('/api/children/:childId/dashboard', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    try {
      const data = store.getChildDashboardData(parent.id, req.params.childId);
      const media = store.listChildEphemeralMedia(parent.id, req.params.childId);
      const audits = store.getRecentPurgeAudits();
      res.json({ ...data, ephemeralMedia: media, purgeAudits: audits });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/children/:childId', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      nickname: z.string().min(2).max(24).optional(),
      age_group: z.enum(['junior', 'curious', 'trailblazer']).optional(),
      preferred_language: z.enum(['en', 'bn', 'bilingual']).optional(),
      permissions: z
        .object({
          camera_enabled: z.boolean().optional(),
          microphone_enabled: z.boolean().optional(),
          ai_companion_enabled: z.boolean().optional(),
          voice_capsules_enabled: z.boolean().optional(),
          low_power_2d_mode: z.boolean().optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid update payload.' });
    try {
      const child = store.updateChild(parent.id, req.params.childId, parsed.data);
      res.json({ child });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/children/:childId', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    try {
      const result = store.deleteChildAndAllData(parent.id, req.params.childId);
      res.json({ deleted: true, ...result });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // --- Parent Assigned Quests ---
  app.post('/api/parent-quests', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      title: z.string().min(2).max(100),
      description: z.string().max(400).default(''),
      rewardXp: z.number().int().min(5).max(30),
      ageSuitability: z.enum(['all', 'junior', 'curious', 'trailblazer']).default('all'),
      dueAt: z.string().nullable().default(null),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid parent quest details.' });
    try {
      const quest = store.addParentQuest(parent.id, parsed.data.childId, parsed.data);
      res.status(201).json({ quest });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // --- AI Companion Dialogue ---
  app.post('/api/companion-dialogue', async (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      trigger: z.enum([
        'reverse_tutoring',
        'object_scan',
        'voice_capsule',
        'sound_scavenger',
        'offline_battery_return',
        'habit_completed',
      ]),
      ageGroup: z.enum(['junior', 'curious', 'trailblazer']),
      language: z.enum(['en', 'bn', 'bilingual']),
      questTitle: z.string().max(120).optional(),
      userMessage: z.string().max(2000).optional(),
      context: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid companion dialogue request.' });

    const child = store.getOwnedChild(parent.id, parsed.data.childId);
    if (!child) return res.status(403).json({ error: 'Unauthorized child profile.' });
    if (!child.permissions.ai_companion_enabled) {
      return res.status(403).json({ error: 'AI Companion interactions are disabled in Parental Controls.' });
    }

    try {
      const reply = await generateCompanionDialogue(parsed.data);
      // Never trust AI XP; enforce server rule
      const serverXp = reply.quest_completed ? SERVER_XP_BY_TRIGGER[parsed.data.trigger] ?? 15 : 0;
      res.json({ ...reply, xp_awarded: serverXp });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // --- Object Scanner ---
  app.post('/api/analyze-object', async (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      imageBase64: z.string().min(32).max(8_000_000),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      ageGroup: z.enum(['junior', 'curious', 'trailblazer']),
      language: z.enum(['en', 'bn', 'bilingual']),
      sceneHint: z.string().max(100).optional(),
      saveEphemeral: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid camera capture payload.' });

    const child = store.getOwnedChild(parent.id, parsed.data.childId);
    if (!child) return res.status(403).json({ error: 'Unauthorized child profile.' });
    if (!child.permissions.camera_enabled) {
      return res.status(403).json({ error: 'Camera scanner is disabled in Parental Controls.' });
    }

    try {
      let mediaRecord = null;
      if (parsed.data.saveEphemeral) {
        const clean = parsed.data.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const buf = Buffer.from(clean, 'base64');
        if (buf.length > 5 * 1024 * 1024) {
          return res.status(413).json({ error: 'Image exceeds 5MB limit.' });
        }
        mediaRecord = store.storeEphemeralMedia({
          parentId: parent.id,
          childId: child.id,
          questId: null,
          mediaType: 'image',
          mimeType: parsed.data.mimeType,
          buffer: buf,
        });
      }

      const analysis = await analyzeObjectImage(parsed.data);
      res.json({ analysis, ephemeralMedia: mediaRecord });
    } catch (err) {
      // Never claim an object was recognized if AI request failed
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // --- Speech Transcription ---
  app.post('/api/transcribe-audio', async (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      audioBase64: z.string().min(16).max(14_000_000),
      mimeType: z.enum(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']),
      language: z.enum(['en', 'bn', 'bilingual']),
      fallbackText: z.string().max(1500).optional(),
      saveEphemeral: z.boolean().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid audio payload.' });

    const child = store.getOwnedChild(parent.id, parsed.data.childId);
    if (!child) return res.status(403).json({ error: 'Unauthorized child profile.' });
    if (!child.permissions.microphone_enabled) {
      return res.status(403).json({ error: 'Microphone features are disabled in Parental Controls.' });
    }

    try {
      let mediaRecord = null;
      if (parsed.data.saveEphemeral) {
        const clean = parsed.data.audioBase64.replace(/^data:[^;]+;base64,/, '');
        const buf = Buffer.from(clean, 'base64');
        mediaRecord = store.storeEphemeralMedia({
          parentId: parent.id,
          childId: child.id,
          questId: null,
          mediaType: 'audio',
          mimeType: parsed.data.mimeType,
          buffer: buf,
        });
      }

      const result = await transcribeChildAudio(parsed.data);
      res.json({ ...result, ephemeralMedia: mediaRecord });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // --- Voice Capsules Memory Card Creation ---
  app.post('/api/voice-capsules', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      adultConsentConfirmed: z.literal(true),
      storyTopic: z.string().min(2).max(120),
      storySummary: z.string().min(5).max(1500),
      audioBase64: z.string().optional(),
      mimeType: z.enum(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Adult participant consent confirmation and a story summary are required.',
      });
    }

    const child = store.getOwnedChild(parent.id, parsed.data.childId);
    if (!child) return res.status(403).json({ error: 'Unauthorized child profile.' });
    if (!child.permissions.voice_capsules_enabled) {
      return res.status(403).json({ error: 'Voice Capsules are disabled in Parental Controls.' });
    }

    let ephemeralMedia = null;
    if (parsed.data.audioBase64 && parsed.data.mimeType) {
      const clean = parsed.data.audioBase64.replace(/^data:[^;]+;base64,/, '');
      ephemeralMedia = store.storeEphemeralMedia({
        parentId: parent.id,
        childId: child.id,
        questId: null,
        mediaType: 'audio',
        mimeType: parsed.data.mimeType,
        buffer: Buffer.from(clean, 'base64'),
      });
    }

    const card = store.addMemoryCard(parent.id, child.id, {
      title_en: `Family Memory: ${parsed.data.storyTopic}`,
      title_bn: `পারিবারিক স্মৃতি: ${parsed.data.storyTopic}`,
      summary_en: parsed.data.storySummary.slice(0, 260),
      summary_bn: `বড়দের কাছ থেকে শোনা একটি অমূল্য গল্প সংরক্ষিত হয়েছে।`,
      illustration_prompt: `Warm watercolor storybook illustration of ${parsed.data.storyTopic}`,
      follow_up_en: 'Ask what made them laugh the hardest during that memory!',
      follow_up_bn: 'সেই সময়ের কোন মজার ঘটনাটায় তাঁরা সবচেয়ে বেশি হেসেছিলেন তা জেনে নাও!',
    });

    const reward = store.awardQuestCompletion({
      parentId: parent.id,
      childId: child.id,
      questZone: 'time_travelers_attic',
      questCode: 'attic_voice_capsule',
      questTitle: `Voice Capsule: ${parsed.data.storyTopic}`,
      awardedXp: 30,
      aiSummary: `Saved family memory card for "${parsed.data.storyTopic}".`,
      badgeCode: 'story_keeper',
    });

    res.status(201).json({ card, ephemeralMedia, ...reward });
  });

  // --- Server-Side Quest Completion ---
  app.post('/api/complete-quest', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      questZone: z.enum([
        'potion_gadget_lab',
        'world_explorers_compass',
        'time_travelers_attic',
        'word_weavers_treehouse',
        'daily_hero_training',
        'scanner',
        'offline_battery',
      ]),
      questCode: z.string().min(2).max(80),
      questTitle: z.string().min(2).max(120),
      questCategory: z.enum(['simple', 'discovery', 'speaking', 'family_story', 'offline', 'parent_habit']),
      aiSummary: z.string().max(500).default('Completed real-world quest.'),
      parentQuestId: z.string().uuid().optional(),
      badgeOverride: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid quest completion payload.' });

    try {
      const xp = QUEST_XP_BY_CATEGORY[parsed.data.questCategory] ?? 15;
      const badgeCode = parsed.data.badgeOverride || ZONE_BADGE_MAP[parsed.data.questZone];
      const result = store.awardQuestCompletion({
        parentId: parent.id,
        childId: parsed.data.childId,
        questZone: parsed.data.questZone,
        questCode: parsed.data.questCode,
        questTitle: parsed.data.questTitle,
        awardedXp: xp,
        aiSummary: parsed.data.aiSummary,
        badgeCode,
        parentQuestId: parsed.data.parentQuestId,
      });
      res.json(result);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // --- Offline Sun-Battery Missions ---
  app.post('/api/offline-missions/start', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      missionTitle: z.string().min(2).max(120),
      targetMinutes: z.union([z.literal(15), z.literal(20), z.literal(30)]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid offline mission parameters.' });
    try {
      const session = store.startOfflineMission(
        parent.id,
        parsed.data.childId,
        parsed.data.missionTitle,
        parsed.data.targetMinutes
      );
      res.status(201).json({ session });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post('/api/offline-missions/complete', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      missionId: z.string().uuid(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid offline mission completion.' });
    try {
      const result = store.completeOfflineMission(parent.id, parsed.data.childId, parsed.data.missionId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // --- Ephemeral Media Vault (48h Privacy Shield) ---
  app.post('/api/ephemeral-media', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const schema = z.object({
      childId: z.string().uuid(),
      questId: z.string().uuid().nullable().default(null),
      mediaType: z.enum(['image', 'audio', 'video']),
      mimeType: z.enum([
        'image/jpeg',
        'image/png',
        'image/webp',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/wav',
      ]),
      dataBase64: z.string().min(8).max(14_000_000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid ephemeral media upload.' });
    try {
      const clean = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, '');
      const record = store.storeEphemeralMedia({
        parentId: parent.id,
        childId: parsed.data.childId,
        questId: parsed.data.questId,
        mediaType: parsed.data.mediaType,
        mimeType: parsed.data.mimeType,
        buffer: Buffer.from(clean, 'base64'),
      });
      res.status(201).json({ media: record });
    } catch (err) {
      res.status(403).json({ error: (err as Error).message });
    }
  });

  app.get('/api/ephemeral-media/list/:childId', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    try {
      const media = store.listChildEphemeralMedia(parent.id, req.params.childId);
      res.json({ media });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.get('/api/ephemeral-media/file/:id', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const result = store.getEphemeralMediaFile(parent.id, req.params.id);
    if (result.status === 'not_found') return res.status(404).json({ error: 'Media not found.' });
    if (result.status === 'forbidden') return res.status(403).json({ error: 'Unauthorized media access.' });
    if (result.status === 'expired') {
      return res.status(410).json({ error: 'Media expired after 48-hour privacy shield.' });
    }
    if (result.status === 'ok') {
      res.setHeader('Content-Type', result.row.mime_type);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(result.buffer);
    }
  });

  app.delete('/api/ephemeral-media/:id', (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    try {
      const deleted = store.deleteEphemeralMediaById(parent.id, req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Media not found.' });
      res.json({ deleted: true });
    } catch (err) {
      res.status(403).json({ error: (err as Error).message });
    }
  });

  app.post('/api/purge-expired-media', async (req, res) => {
    const parent = requireParent(req, res);
    if (!parent) return;
    const audit = await purgeExpiredMedia({ store });
    res.json({ audit });
  });

  return { app, store };
}

// Start server when run directly (not imported by Vitest)
const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith('index.ts');
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  const { app, store } = createPhygitalApp();

  // Schedule purgeExpiredMedia every 5 minutes
  setInterval(() => {
    void purgeExpiredMedia({
      store,
      alertAdmin: async (summary) => {
        console.error('[PHYGITAL ALERT] Persistent media purge failure:', summary);
      },
    });
  }, 5 * 60 * 1000);

  app.listen(port, () => {
    console.log(
      `[PHYGITAL API] Listening on http://127.0.0.1:${port} (AI mode: ${
        process.env.GEMINI_API_KEY ? 'gemini' : 'development_mock'
      })`
    );
  });
}
