// Supabase Edge Function: transcribe-audio
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { z } from 'https://esm.sh/zod@3.24.1';

const AudioSchema = z.object({
  childId: z.string().uuid(),
  audioBase64: z.string().min(32).max(14_000_000),
  mimeType: z.enum(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']),
  language: z.enum(['en', 'bn', 'bilingual']),
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

    const parsed = AudioSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid audio payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { childId, audioBase64, mimeType, language } = parsed.data;
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

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const prompt = `Transcribe this child/family voice recording accurately and kindly (${language} context — may mix English and Bengali). Return JSON: {"transcript": "...", "detected_language": "en|bn|bilingual"}.`;

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
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Audio transcription failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const raw = JSON.parse(json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
    return new Response(
      JSON.stringify({
        transcript: String(raw.transcript ?? ''),
        detected_language: raw.detected_language ?? language,
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
