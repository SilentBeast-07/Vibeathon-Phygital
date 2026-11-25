// Supabase Edge Function: analyze-object
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { z } from 'https://esm.sh/zod@3.24.1';

const AnalyzeSchema = z.object({
  childId: z.string().uuid(),
  imageBase64: z.string().min(32).max(6_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  ageGroup: z.enum(['junior', 'curious', 'trailblazer']),
  language: z.enum(['en', 'bn', 'bilingual']),
});

const OutputSchema = z.object({
  detected_objects: z.array(z.string()).min(1).max(6),
  zone: z.enum([
    'potion_gadget_lab',
    'world_explorers_compass',
    'time_travelers_attic',
    'word_weavers_treehouse',
    'daily_hero_training',
  ]),
  quest_title_en: z.string(),
  quest_title_bn: z.string(),
  quest_instructions_en: z.string(),
  quest_instructions_bn: z.string(),
  safety_note_en: z.string(),
  safety_note_bn: z.string(),
  follow_up_question_en: z.string(),
  follow_up_question_bn: z.string(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const parsed = AnalyzeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid image payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { childId, imageBase64, mimeType, ageGroup, language } = parsed.data;
    const { data: child } = await supabase
      .from('child_profiles')
      .select('id')
      .eq('id', childId)
      .single();

    if (!child) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const prompt = `Identify safe everyday objects visible in this photo and create ONE safe, offline real-world learning quest for age group "${ageGroup}" (${language}).
If a messy desk/room is visible, propose a playful "Clutter Monster" cleanup quest.
Never instruct tasting unknown substances, mixing household chemicals, or touching sharp/hot hazards.
Return STRICT JSON matching the required fields.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: cleanBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
        }),
      }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Vision analysis failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const validated = OutputSchema.safeParse(JSON.parse(raw));
    if (!validated.success) {
      return new Response(JSON.stringify({ error: 'Invalid vision schema returned' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ...validated.data, mode: 'gemini' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
