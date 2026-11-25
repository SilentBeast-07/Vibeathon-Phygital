// Supabase Edge Function: companion-dialogue
// Deployable to Deno runtime on Supabase Edge Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { z } from 'https://esm.sh/zod@3.24.1';

const RequestSchema = z.object({
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

const DialogueTurnSchema = z.object({
  character: z.enum(['leo', 'maya']),
  emotion: z.enum(['curious', 'amazed', 'happy', 'thinking', 'surprised', 'encouraging']),
  text_en: z.string(),
  text_bn: z.string(),
});

const ResponseSchema = z.object({
  active_speaker: z.enum(['leo', 'maya', 'both']),
  dialogue_turns: z.array(DialogueTurnSchema).min(1).max(4),
  quest_completed: z.boolean(),
  xp_awarded: z.number().int().min(0).max(30),
  next_action: z.enum(['observe', 'explain_more', 'celebrate', 'try_experiment', 'ask_family']),
  animation: z.enum(['idle', 'talking', 'happy', 'surprised', 'thinking', 'celebration']),
});

const XP_BY_TRIGGER: Record<string, number> = {
  reverse_tutoring: 25,
  object_scan: 20,
  voice_capsule: 30,
  sound_scavenger: 20,
  offline_battery_return: 30,
  habit_completed: 15,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', issues: parsed.error.issues }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { childId, trigger, ageGroup, language, questTitle, userMessage } = parsed.data;

    // Verify ownership via RLS
    const { data: child, error: childErr } = await supabase
      .from('child_profiles')
      .select('id, nickname, age_group')
      .eq('id', childId)
      .single();

    if (childErr || !child) {
      return new Response(JSON.stringify({ error: 'Child profile not found or unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not configured on Edge Function environment.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `You are writing dialogue for Leo (curious, analytical young inventor) and Maya (warm, adventurous storyteller) in PHYGITAL for a child in age group "${ageGroup}" (${language} preference).
Safety & Privacy Rules:
- NEVER ask for or store real full names, school names, home addresses, phone numbers, or passwords.
- NEVER suggest hazardous experiments, tasting unknown items, or sharp/electrical dangers.
- NEVER shame pronunciation, grammar, or accent. Always encourage curiosity.
- Return STRICT JSON matching the required schema.`;

    const userPrompt = `Trigger: ${trigger}
Quest: ${questTitle ?? 'Real-world discovery'}
Child response: ${userMessage ?? '(completed physical activity)'}
Respond with 2 dialogue turns (English + natural Bengali text_bn) and evaluate gently.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: 'Gemini API failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const validated = ResponseSchema.safeParse(JSON.parse(rawText));

    if (!validated.success) {
      return new Response(JSON.stringify({ error: 'AI response schema mismatch' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Never trust AI-generated XP values — enforce server rule
    const serverXp = validated.data.quest_completed ? XP_BY_TRIGGER[trigger] ?? 15 : 0;

    return new Response(
      JSON.stringify({
        ...validated.data,
        xp_awarded: serverXp,
        mode: 'gemini',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
