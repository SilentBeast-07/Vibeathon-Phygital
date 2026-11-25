-- ============================================================================
-- 001_initial_schema.sql
-- Core permanent tables for Project Phygital (strictly free of raw child media)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Child explorer profiles (nickname-only, no real full name or PII required)
CREATE TABLE IF NOT EXISTS public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 2 AND 24),
  age_group TEXT NOT NULL CHECK (age_group IN ('junior', 'curious', 'trailblazer')),
  preferred_language TEXT NOT NULL DEFAULT 'bilingual' CHECK (preferred_language IN ('en', 'bn', 'bilingual')),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  sun_battery_level INTEGER NOT NULL DEFAULT 40 CHECK (sun_battery_level BETWEEN 0 AND 100),
  permissions JSONB NOT NULL DEFAULT '{
    "camera_enabled": false,
    "microphone_enabled": false,
    "ai_companion_enabled": true,
    "voice_capsules_enabled": true,
    "parent_pin_hash": null
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id ON public.child_profiles(parent_id);

-- Permanent anonymized quest progress & learning summaries
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  quest_zone TEXT NOT NULL CHECK (quest_zone IN (
    'potion_gadget_lab',
    'world_explorers_compass',
    'time_travelers_attic',
    'word_weavers_treehouse',
    'daily_hero_training',
    'scanner',
    'offline_battery'
  )),
  quest_code TEXT NOT NULL,
  quest_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  ai_evaluation_summary TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded BETWEEN 0 AND 50),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_child_id ON public.quest_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_completed_at ON public.quest_progress(completed_at DESC);

-- Parent-assigned real-world quests
CREATE TABLE IF NOT EXISTS public.parent_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 100),
  description TEXT NOT NULL DEFAULT '',
  reward_xp INTEGER NOT NULL DEFAULT 15 CHECK (reward_xp BETWEEN 5 AND 30),
  age_suitability TEXT NOT NULL DEFAULT 'all' CHECK (age_suitability IN ('all', 'junior', 'curious', 'trailblazer')),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_quests_child_id ON public.parent_quests(child_id);

-- Catalog of unlockable badges
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_code TEXT NOT NULL UNIQUE,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  zone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.child_badges (
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, badge_id)
);

-- Server-validated offline mission timer sessions
CREATE TABLE IF NOT EXISTS public.offline_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  mission_title TEXT NOT NULL,
  target_minutes INTEGER NOT NULL CHECK (target_minutes IN (15, 20, 30)),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  energy_awarded INTEGER NOT NULL DEFAULT 0 CHECK (energy_awarded BETWEEN 0 AND 50),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_offline_missions_child_active
  ON public.offline_missions(child_id, status)
  WHERE status = 'active';

-- Aggregate-only operational audit table for 48-hour purge worker (no child PII)
CREATE TABLE IF NOT EXISTS public.media_purge_audit (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_found INTEGER NOT NULL DEFAULT 0,
  storage_deleted INTEGER NOT NULL DEFAULT 0,
  metadata_deleted INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ok', 'partial_failure', 'failed')),
  error_summary TEXT
);

-- Seed core Phygital badges
INSERT INTO public.badges (badge_code, badge_name, badge_description, zone)
VALUES
  ('nature_detective', 'Nature Detective', 'Discovered natural wonders in the physical world.', 'world_explorers_compass'),
  ('mini_scientist', 'Mini Scientist', 'Explored safe everyday science experiments.', 'potion_gadget_lab'),
  ('story_keeper', 'Story Keeper', 'Preserved a family memory or folk tale.', 'time_travelers_attic'),
  ('bengali_word_wizard', 'Bengali Word Wizard', 'Practiced joyful English & Bengali storytelling.', 'word_weavers_treehouse'),
  ('family_explorer', 'Family Explorer', 'Completed an intergenerational discovery quest.', 'time_travelers_attic'),
  ('everyday_hero', 'Everyday Hero', 'Built helpful real-world habits and responsibilities.', 'daily_hero_training'),
  ('screen_free_champion', 'Screen-Free Champion', 'Charged the Offline Sun-Battery away from screens.', 'offline_battery')
ON CONFLICT (badge_code) DO NOTHING;
