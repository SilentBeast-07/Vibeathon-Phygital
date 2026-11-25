-- ============================================================================
-- 002_rls_policies.sql
-- Strict Row-Level Security enforcing parent-child ownership isolation
-- ============================================================================

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_purge_audit ENABLE ROW LEVEL SECURITY;

-- Helper verifying current authenticated parent owns target child profile
CREATE OR REPLACE FUNCTION public.is_child_owner(target_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = target_child_id
      AND cp.parent_id = auth.uid()
  );
$$;

-- child_profiles: parents can CRUD only their own children
CREATE POLICY "Parents select own children"
  ON public.child_profiles FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents insert own children"
  ON public.child_profiles FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents update own children"
  ON public.child_profiles FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents delete own children"
  ON public.child_profiles FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());

-- quest_progress: read-only for parent owner; inserts performed via server RPC
CREATE POLICY "Parents read own child quest progress"
  ON public.quest_progress FOR SELECT
  TO authenticated
  USING (public.is_child_owner(child_id));

-- parent_quests: full control for parent owner
CREATE POLICY "Parents manage own child parent_quests"
  ON public.parent_quests FOR ALL
  TO authenticated
  USING (public.is_child_owner(child_id))
  WITH CHECK (public.is_child_owner(child_id));

-- badges: readable by all authenticated users
CREATE POLICY "Authenticated users read badge catalog"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

-- child_badges: readable by parent owner
CREATE POLICY "Parents read own child badges"
  ON public.child_badges FOR SELECT
  TO authenticated
  USING (public.is_child_owner(child_id));

-- offline_missions: managed by parent owner
CREATE POLICY "Parents manage own child offline missions"
  ON public.offline_missions FOR ALL
  TO authenticated
  USING (public.is_child_owner(child_id))
  WITH CHECK (public.is_child_owner(child_id));

-- media_purge_audit: aggregate stats readable by authenticated parents (no PII)
CREATE POLICY "Authenticated read aggregate purge stats"
  ON public.media_purge_audit FOR SELECT
  TO authenticated
  USING (true);
