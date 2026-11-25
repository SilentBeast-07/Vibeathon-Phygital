// Supabase Edge Function: complete-quest
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { z } from 'https://esm.sh/zod@3.24.1';

const CompleteSchema = z.object({
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
  aiSummary: z.string().max(500).optional(),
  parentQuestId: z.string().uuid().optional(),
});

const SERVER_XP_TABLE: Record<string, number> = {
  simple: 10,
  discovery: 20,
  speaking: 25,
  family_story: 30,
  offline: 30,
  parent_habit: 15,
};

const ZONE_BADGE_MAP: Record<string, string> = {
  potion_gadget_lab: 'mini_scientist',
  world_explorers_compass: 'nature_detective',
  time_travelers_attic: 'story_keeper',
  word_weavers_treehouse: 'bengali_word_wizard',
  daily_hero_training: 'everyday_hero',
  offline_battery: 'screen_free_champion',
};

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

    const parsed = CompleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid quest payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { childId, questZone, questCode, questTitle, questCategory, aiSummary, parentQuestId } =
      parsed.data;

    let awardedXp = SERVER_XP_TABLE[questCategory] ?? 15;
    if (parentQuestId) {
      const { data: pq } = await supabase
        .from('parent_quests')
        .select('id, reward_xp')
        .eq('id', parentQuestId)
        .eq('child_id', childId)
        .single();
      if (pq) {
        awardedXp = Math.min(Math.max(pq.reward_xp, 10), 30);
        await supabase.from('parent_quests').update({ status: 'completed' }).eq('id', parentQuestId);
      }
    }

    const badgeCode = ZONE_BADGE_MAP[questZone] ?? null;

    const { data, error } = await supabase.rpc('award_quest_xp', {
      p_child_id: childId,
      p_quest_zone: questZone,
      p_quest_code: questCode,
      p_quest_title: questTitle,
      p_ai_summary: aiSummary ?? 'Completed real-world exploration.',
      p_requested_xp: awardedXp,
      p_badge_code: badgeCode,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ result: data?.[0] ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
