export type AgeGroup = 'junior' | 'curious' | 'trailblazer';
export type PreferredLanguage = 'en' | 'bn' | 'bilingual';

export type AdventureZoneId =
  | 'potion_gadget_lab'
  | 'world_explorers_compass'
  | 'time_travelers_attic'
  | 'word_weavers_treehouse'
  | 'daily_hero_training';

export type QuestZone = AdventureZoneId | 'scanner' | 'offline_battery';

export type QuestCategory =
  | 'simple'
  | 'discovery'
  | 'speaking'
  | 'family_story'
  | 'offline'
  | 'parent_habit';

export type CompanionAnimation =
  | 'idle'
  | 'talking'
  | 'happy'
  | 'surprised'
  | 'thinking'
  | 'celebration';

export type DialogueTrigger =
  | 'reverse_tutoring'
  | 'object_scan'
  | 'voice_capsule'
  | 'sound_scavenger'
  | 'offline_battery_return'
  | 'habit_completed';

export interface ChildPermissions {
  camera_enabled: boolean;
  microphone_enabled: boolean;
  ai_companion_enabled: boolean;
  voice_capsules_enabled: boolean;
  low_power_2d_mode: boolean;
}

export interface ChildProfile {
  id: string;
  parent_id: string;
  nickname: string;
  age_group: AgeGroup;
  preferred_language: PreferredLanguage;
  total_xp: number;
  level: number;
  sun_battery_level: number;
  permissions: ChildPermissions;
  created_at: string;
}

export interface ParentAccount {
  id: string;
  email: string;
  display_name: string;
  has_pin: boolean;
}

export interface QuestProgressItem {
  id: string;
  child_id: string;
  quest_zone: QuestZone;
  quest_code: string;
  quest_title: string;
  status: 'in_progress' | 'completed';
  ai_evaluation_summary: string;
  xp_awarded: number;
  completed_at: string;
}

export interface ParentQuest {
  id: string;
  child_id: string;
  title: string;
  description: string;
  reward_xp: number;
  age_suitability: 'all' | AgeGroup;
  due_at: string | null;
  status: 'pending' | 'completed' | 'archived';
  created_at: string;
}

export interface BadgeInfo {
  badge_code: string;
  badge_name: string;
  badge_description: string;
  zone: QuestZone;
  unlocked_at?: string;
}

export interface MemoryCard {
  id: string;
  child_id: string;
  title_en: string;
  title_bn: string;
  summary_en: string;
  summary_bn: string;
  illustration_prompt: string;
  follow_up_en: string;
  follow_up_bn: string;
  created_at: string;
}

export interface OfflineMissionSession {
  id: string;
  child_id: string;
  mission_title: string;
  target_minutes: 15 | 20 | 30;
  started_at: string;
  completed_at: string | null;
  energy_awarded: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface EphemeralMediaRecord {
  id: string;
  child_id: string;
  quest_id: string | null;
  media_type: 'image' | 'audio' | 'video';
  mime_type: string;
  size_bytes: number;
  created_at: string;
  expires_at: string;
  remaining_seconds: number;
  is_expired: boolean;
}

export interface PurgeAuditEntry {
  id: number;
  ran_at: string;
  expired_found: number;
  storage_deleted: number;
  metadata_deleted: number;
  failure_count: number;
  status: 'ok' | 'partial_failure' | 'failed';
  error_summary: string | null;
}

export interface DialogueTurn {
  character: 'leo' | 'maya';
  emotion: 'curious' | 'amazed' | 'happy' | 'thinking' | 'surprised' | 'encouraging';
  text_en: string;
  text_bn: string;
}

export interface CompanionDialogueResponse {
  active_speaker: 'leo' | 'maya' | 'both';
  dialogue_turns: DialogueTurn[];
  quest_completed: boolean;
  xp_awarded: number;
  next_action: 'observe' | 'explain_more' | 'celebrate' | 'try_experiment' | 'ask_family';
  animation: CompanionAnimation;
  evaluation_summary?: string;
  mode: 'gemini' | 'development_mock';
}

export interface ObjectScanResponse {
  detected_objects: string[];
  zone: AdventureZoneId;
  quest_title_en: string;
  quest_title_bn: string;
  quest_instructions_en: string;
  quest_instructions_bn: string;
  safety_note_en: string;
  safety_note_bn: string;
  follow_up_question_en: string;
  follow_up_question_bn: string;
  mode: 'gemini' | 'development_mock';
}

export interface QuestDefinition {
  code: string;
  zone: AdventureZoneId;
  category: QuestCategory;
  xp: number;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  safety_en?: string;
  safety_bn?: string;
  age_hint: Record<AgeGroup, string>;
  interactive_type: 'checklist' | 'map_draw' | 'voice_capsule' | 'speaking' | 'habit' | 'experiment';
  steps_en: string[];
  steps_bn: string[];
}
