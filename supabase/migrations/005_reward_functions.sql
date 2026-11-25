-- ============================================================================
-- 005_reward_functions.sql
-- Server-authoritative XP, level progression, and badge unlocking RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(GREATEST(xp, 0)::NUMERIC / 25.0))::INTEGER + 1);
$$;

CREATE OR REPLACE FUNCTION public.award_quest_xp(
  p_child_id UUID,
  p_quest_zone TEXT,
  p_quest_code TEXT,
  p_quest_title TEXT,
  p_ai_summary TEXT,
  p_requested_xp INTEGER,
  p_badge_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_total_xp INTEGER,
  new_level INTEGER,
  awarded_xp INTEGER,
  unlocked_badge TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safe_xp INTEGER;
  v_total_xp INTEGER;
  v_level INTEGER;
  v_badge_id UUID;
  v_unlocked TEXT := NULL;
BEGIN
  -- Verify parent ownership when called under user JWT
  IF auth.uid() IS NOT NULL AND NOT public.is_child_owner(p_child_id) THEN
    RAISE EXCEPTION 'Unauthorized child profile access';
  END IF;

  -- Server-side XP clamp (never trust client or arbitrary AI XP numbers)
  v_safe_xp := LEAST(GREATEST(COALESCE(p_requested_xp, 10), 10), 30);

  INSERT INTO public.quest_progress (
    child_id, quest_zone, quest_code, quest_title, status, ai_evaluation_summary, xp_awarded
  )
  VALUES (
    p_child_id, p_quest_zone, p_quest_code, p_quest_title, 'completed', p_ai_summary, v_safe_xp
  );

  UPDATE public.child_profiles
  SET
    total_xp = total_xp + v_safe_xp,
    level = public.calculate_level(total_xp + v_safe_xp),
    updated_at = NOW()
  WHERE id = p_child_id
  RETURNING total_xp, level INTO v_total_xp, v_level;

  IF p_badge_code IS NOT NULL THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE badge_code = p_badge_code;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.child_badges (child_id, badge_id)
      VALUES (p_child_id, v_badge_id)
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_unlocked := p_badge_code;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_total_xp, v_level, v_safe_xp, v_unlocked;
END;
$$;
