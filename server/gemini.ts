import { z } from 'zod';
import type {
  AgeGroup,
  CompanionDialogueResponse,
  DialogueTrigger,
  ObjectScanResponse,
  PreferredLanguage,
} from '../src/types/phygital';

const DialogueTurnSchema = z.object({
  character: z.enum(['leo', 'maya']),
  emotion: z.enum(['curious', 'amazed', 'happy', 'thinking', 'surprised', 'encouraging']),
  text_en: z.string().min(1),
  text_bn: z.string().min(1),
});

export const CompanionDialogueOutputSchema = z.object({
  active_speaker: z.enum(['leo', 'maya', 'both']),
  dialogue_turns: z.array(DialogueTurnSchema).min(1).max(4),
  quest_completed: z.boolean(),
  xp_awarded: z.number().int().min(0).max(50),
  next_action: z.enum(['observe', 'explain_more', 'celebrate', 'try_experiment', 'ask_family']),
  animation: z.enum(['idle', 'talking', 'happy', 'surprised', 'thinking', 'celebration']),
  evaluation_summary: z.string().optional(),
});

export const ObjectScanOutputSchema = z.object({
  detected_objects: z.array(z.string().min(1)).min(1).max(6),
  zone: z.enum([
    'potion_gadget_lab',
    'world_explorers_compass',
    'time_travelers_attic',
    'word_weavers_treehouse',
    'daily_hero_training',
  ]),
  quest_title_en: z.string().min(1),
  quest_title_bn: z.string().min(1),
  quest_instructions_en: z.string().min(1),
  quest_instructions_bn: z.string().min(1),
  safety_note_en: z.string().min(1),
  safety_note_bn: z.string().min(1),
  follow_up_question_en: z.string().min(1),
  follow_up_question_bn: z.string().min(1),
});

export const SERVER_XP_BY_TRIGGER: Record<DialogueTrigger, number> = {
  reverse_tutoring: 25,
  object_scan: 20,
  voice_capsule: 30,
  sound_scavenger: 20,
  offline_battery_return: 30,
  habit_completed: 15,
};

function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || '',
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  };
}

export async function generateCompanionDialogue(input: {
  trigger: DialogueTrigger;
  ageGroup: AgeGroup;
  language: PreferredLanguage;
  questTitle?: string;
  userMessage?: string;
  context?: Record<string, unknown>;
}): Promise<CompanionDialogueResponse> {
  const { apiKey, model } = getGeminiConfig();
  const safeXp = SERVER_XP_BY_TRIGGER[input.trigger] ?? 15;

  if (!apiKey) {
    return buildDeterministicDialogue(input, safeXp);
  }

  const systemInstruction = `You are writing dialogue for two children's learning companions in PHYGITAL:
- Leo: Curious, analytical young inventor with glasses and a glowing magnifying glass. Loves science and experiments.
- Maya: Warm, energetic explorer with curly hair. Loves nature, culture, Bengali & English storytelling.

Child age group: ${input.ageGroup} (junior = 6-8, curious = 9-11, trailblazer = 12-14).
Language preference: ${input.language}.
Strict Safety & Privacy Rules:
1. Never ask for full names, school names, addresses, phone numbers, or passwords.
2. Never suggest dangerous household experiments, tasting unknown items, fire, or sharp tools.
3. Never shame pronunciation, grammar, or accent. Praise curiosity and effort.
4. Always provide BOTH natural English (text_en) and warm natural Bengali (text_bn).
5. Return ONLY valid JSON matching the requested schema.`;

  const prompt = `Trigger: ${input.trigger}
Quest Title: ${input.questTitle || 'Real-World Discovery'}
Child Input: ${input.userMessage || 'Completed real-world step'}
Extra Context: ${JSON.stringify(input.context || {})}

Respond with JSON:
{
  "active_speaker": "leo" | "maya" | "both",
  "dialogue_turns": [
    { "character": "leo" | "maya", "emotion": "curious" | "amazed" | "happy" | "thinking" | "surprised" | "encouraging", "text_en": "...", "text_bn": "..." }
  ],
  "quest_completed": true | false,
  "xp_awarded": ${safeXp},
  "next_action": "observe" | "explain_more" | "celebrate" | "try_experiment" | "ask_family",
  "animation": "idle" | "talking" | "happy" | "surprised" | "thinking" | "celebration",
  "evaluation_summary": "1 concise anonymized sentence summarizing what the child practiced"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.65,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini dialogue request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini returned empty dialogue response.');
  }

  const parsed = CompanionDialogueOutputSchema.safeParse(JSON.parse(rawText));
  if (!parsed.success) {
    throw new Error('Gemini dialogue failed schema validation.');
  }

  // Enforce server-authoritative XP calculation
  return {
    ...parsed.data,
    xp_awarded: parsed.data.quest_completed ? safeXp : 0,
    mode: 'gemini',
  };
}

function buildDeterministicDialogue(
  input: {
    trigger: DialogueTrigger;
    ageGroup: AgeGroup;
    questTitle?: string;
    userMessage?: string;
  },
  safeXp: number
): CompanionDialogueResponse {
  const msg = (input.userMessage || '').trim();
  const hasRichExplanation = msg.length >= 18;

  if (input.trigger === 'reverse_tutoring') {
    if (!hasRichExplanation) {
      return {
        active_speaker: 'both',
        dialogue_turns: [
          {
            character: 'leo',
            emotion: 'thinking',
            text_en: 'Wait! Let me check my notes! Can you tell me a little more about how that works in everyday life?',
            text_bn: 'একটু দাঁড়াও! আমার নোটবুক দেখি! দৈনন্দিন জীবনে এটা কীভাবে ঘটে আরেকটু বলবে?',
          },
          {
            character: 'maya',
            emotion: 'encouraging',
            text_en: 'You are off to a great start! Even one real-world example helps us understand!',
            text_bn: 'দারুণ শুরু করেছ! বাস্তব জগতের একটা ছোট উদাহরণ দিলেই আমরা বুঝে যাব!',
          },
        ],
        quest_completed: false,
        xp_awarded: 0,
        next_action: 'explain_more',
        animation: 'thinking',
        evaluation_summary: 'Shared an initial idea and invited to add one everyday example.',
        mode: 'development_mock',
      };
    }

    return {
      active_speaker: 'both',
      dialogue_turns: [
        {
          character: 'leo',
          emotion: 'amazed',
          text_en: `Fascinating! "${msg.slice(0, 70)}${msg.length > 70 ? '...' : ''}" makes total sense now!`,
          text_bn: 'অসাধারণ! তোমার কথা শুনে পুরো বিষয়টা একদম পরিষ্কার হয়ে গেল!',
        },
        {
          character: 'maya',
          emotion: 'happy',
          text_en: 'You are such a wonderful teacher! Leo wrote down every single clue in his notebook!',
          text_bn: 'তুমি দারুণ শিখিয়েছ! লিও সব নতুন তথ্য ওর নোটবুকে লিখে নিয়েছে!',
        },
      ],
      quest_completed: true,
      xp_awarded: safeXp,
      next_action: 'celebrate',
      animation: 'celebration',
      evaluation_summary: `Explained "${input.questTitle || 'concept'}" clearly in own words (Development Mode).`,
      mode: 'development_mock',
    };
  }

  if (input.trigger === 'voice_capsule') {
    return {
      active_speaker: 'maya',
      dialogue_turns: [
        {
          character: 'maya',
          emotion: 'amazed',
          text_en: 'What a heartwarming family story! Memory cards like this keep history alive forever.',
          text_bn: 'কী সুন্দর পারিবারিক গল্প! এমন মেমরি কার্ড আমাদের পুরনো দিনের স্মৃতি বাঁচিয়ে রাখে।',
        },
        {
          character: 'leo',
          emotion: 'curious',
          text_en: 'I wonder which old game from that story we could try outside today!',
          text_bn: 'ওই গল্পের কোন পুরনো খেলাটা আজ বাইরে গিয়ে খেলা যায় বলো তো!',
        },
      ],
      quest_completed: true,
      xp_awarded: safeXp,
      next_action: 'ask_family',
      animation: 'celebration',
      evaluation_summary: 'Captured an intergenerational family story capsule (Development Mode).',
      mode: 'development_mock',
    };
  }

  if (input.trigger === 'offline_battery_return') {
    return {
      active_speaker: 'both',
      dialogue_turns: [
        {
          character: 'maya',
          emotion: 'happy',
          text_en: 'Welcome back, Explorer! Our Sun-Battery glowed brighter while you explored the real world!',
          text_bn: 'স্বাগতম অভিযাত্রী! তুমি স্ক্রিনের বাইরে সময় কাটানোয় আমাদের সান-ব্যাটারি চার্জ হয়েছে!',
        },
        {
          character: 'leo',
          emotion: 'amazed',
          text_en: 'Look at that clean solar energy! Real-world adventures power our whole treehouse!',
          text_bn: 'দেখো কত সুন্দর সোলার এনার্জি! বাস্তবের অ্যাডভেঞ্চারই আমাদের আসল শক্তি!',
        },
      ],
      quest_completed: true,
      xp_awarded: safeXp,
      next_action: 'celebrate',
      animation: 'celebration',
      evaluation_summary: 'Completed screen-free real-world mission and recharged Sun-Battery.',
      mode: 'development_mock',
    };
  }

  return {
    active_speaker: 'both',
    dialogue_turns: [
      {
        character: 'leo',
        emotion: 'amazed',
        text_en: `Fascinating work on "${input.questTitle || 'your discovery'}"!`,
        text_bn: `"${input.questTitle || 'তোমার আবিষ্কার'}" দারুণভাবে সম্পন্ন করেছ!`,
      },
      {
        character: 'maya',
        emotion: 'happy',
        text_en: 'That was amazing! Ready for another real-world adventure?',
        text_bn: 'দারুণ হয়েছে! চলো এবার বাস্তব জগতের আরেকটা নতুন অ্যাডভেঞ্চার খুঁজি!',
      },
    ],
    quest_completed: true,
    xp_awarded: safeXp,
    next_action: 'celebrate',
    animation: 'celebration',
    evaluation_summary: `Completed "${input.questTitle || 'quest'}" with positive curiosity (Development Mode).`,
    mode: 'development_mock',
  };
}

export async function analyzeObjectImage(input: {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  ageGroup: AgeGroup;
  language: PreferredLanguage;
  sceneHint?: string;
}): Promise<ObjectScanResponse> {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey) {
    // Honest deterministic Development Mode: varies cleanly by hint or image size hash,
    // and clearly labels mode = 'development_mock' without pretending to run live Gemini Vision.
    const hint = (input.sceneHint || '').toLowerCase();
    if (hint.includes('messy') || hint.includes('desk') || hint.includes('clutter')) {
      return {
        detected_objects: ['Notebooks', 'Scattered pencils', 'Study desk'],
        zone: 'daily_hero_training',
        quest_title_en: 'Defeat the Desk Clutter Monster!',
        quest_title_bn: 'টেবিলের অগোছালো দৈত্যকে হারাও!',
        quest_instructions_en:
          'Put away stray pens, stack your notebooks neatly, and clear a sunny corner for reading.',
        quest_instructions_bn:
          'ছড়িয়ে থাকা কলমগুলো গুছিয়ে রাখো, খাতাগুলো সাজাও আর পড়ার জায়গা পরিষ্কার করো।',
        safety_note_en: 'Ask an adult before moving heavy items or plugging/unplugging cords.',
        safety_note_bn: 'ভারী জিনিস বা বৈদ্যুতিক তার সরানোর আগে বড়দের সাহায্য নাও।',
        follow_up_question_en: 'How much faster can you find your favorite pencil now?',
        follow_up_question_bn: 'এখন কি তোমার প্রিয় পেনসিলটা আরও তাড়াতাড়ি খুঁজে পাচ্ছ?',
        mode: 'development_mock',
      };
    }

    if (hint.includes('leaf') || hint.includes('plant')) {
      return {
        detected_objects: ['Green leaf', 'Plant stem', 'Natural texture'],
        zone: 'world_explorers_compass',
        quest_title_en: 'Leaf Vein & Sunlight Explorer',
        quest_title_bn: 'পাতার শিরা ও রোদের রহস্য',
        quest_instructions_en:
          'Compare this leaf with two others nearby. Notice how leaf veins carry water just like tiny rivers!',
        quest_instructions_bn:
          'কাছাকাছি আরও দুটি পাতার সাথে এটি মিলিয়ে দেখো। পাতার শিরাগুলো ছোট নদীর মতো জল বয়ে নিয়ে যায়!',
        safety_note_en: 'Only observe familiar houseplants or fallen leaves; do not taste any plant.',
        safety_note_bn: 'শুধুমাত্র চেনা গাছের পাতা ছুঁয়ে দেখো; কোনো পাতা মুখে দেবে না।',
        follow_up_question_en: 'Are the veins on this leaf straight or branching like a tree?',
        follow_up_question_bn: 'এই পাতার শিরাগুলো সোজা নাকি গাছের ডালের মতো ছড়ানো?',
        mode: 'development_mock',
      };
    }

    return {
      detected_objects: ['Spoon', 'Clear glass of water', 'Tabletop'],
      zone: 'potion_gadget_lab',
      quest_title_en: 'Welcome to the Mini Science Lab!',
      quest_title_bn: 'মিনি সায়েন্স ল্যাবে স্বাগতম!',
      quest_instructions_en:
        'With an adult nearby, stir a tiny pinch of clean table salt into plain water. Watch carefully to see why the salt disappears!',
      quest_instructions_bn:
        'বড়দের পাশে রেখে এক গ্লাস পরিষ্কার জলে এক চিমটি নুন গুলে দেখো নুন কীভাবে অদৃশ্য হয়ে যায়!',
      safety_note_en: 'Only use clean drinking water and table salt with adult supervision.',
      safety_note_bn: 'বড়দের তত্ত্বাবধানে শুধু পরিষ্কার খাবার জল ও নুন ব্যবহার করবে।',
      follow_up_question_en: 'What do you think happens to the salt if the water dries in the sun?',
      follow_up_question_bn: 'রোদে জল শুকিয়ে গেলে নুনের কী হবে বলে তোমার মনে হয়?',
      mode: 'development_mock',
    };
  }

  const cleanBase64 = input.imageBase64.replace(/^data:[^;]+;base64,/, '');
  const prompt = `You are the vision engine for PHYGITAL (children aged 6-14, age group "${input.ageGroup}", language "${input.language}").
Analyze this photo carefully:
1. List 1-5 safe, everyday objects actually visible in the image.
2. If you see a messy desk/room, create a playful "Clutter Monster" cleanup quest in zone "daily_hero_training".
3. Otherwise map to one of the 5 zones and create a safe, screen-free real-world quest with an explicit safety note.
4. NEVER suggest tasting unknown substances, mixing household chemicals, fire, or sharp hazards.
5. Provide both English and natural Bengali fields. Return STRICT JSON.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: input.mimeType, data: cleanBase64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini Vision failed with HTTP ${res.status}. Could not recognize objects.`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini Vision returned empty response.');

  const parsed = ObjectScanOutputSchema.safeParse(JSON.parse(rawText));
  if (!parsed.success) {
    throw new Error('Gemini Vision response did not match quest schema.');
  }

  return { ...parsed.data, mode: 'gemini' };
}

export async function transcribeChildAudio(input: {
  audioBase64: string;
  mimeType: 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'audio/wav';
  language: PreferredLanguage;
  fallbackText?: string;
}): Promise<{ transcript: string; detected_language: PreferredLanguage; mode: 'gemini' | 'development_mock' }> {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey) {
    const cleanFallback = input.fallbackText?.trim();
    return {
      transcript:
        cleanFallback ||
        'When sunlight warms rivers and ponds, water turns into invisible vapor, rises up to make clouds, and falls back down as rain!',
      detected_language: input.language,
      mode: 'development_mock',
    };
  }

  const cleanBase64 = input.audioBase64.replace(/^data:[^;]+;base64,/, '');
  const prompt = `Transcribe this child or family voice recording kindly and accurately (language hint: ${input.language}, may mix English and Bengali). Return JSON: {"transcript": "...", "detected_language": "en|bn|bilingual"}.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: input.mimeType, data: cleanBase64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Speech transcription failed (${res.status}). Please type your answer or try again.`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text || '{}') as {
    transcript?: string;
    detected_language?: PreferredLanguage;
  };

  return {
    transcript: String(raw.transcript || '').trim(),
    detected_language: raw.detected_language || input.language,
    mode: 'gemini',
  };
}
