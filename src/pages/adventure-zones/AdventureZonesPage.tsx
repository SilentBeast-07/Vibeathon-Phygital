import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { BilingualText } from '@/components/common/BilingualText';
import { ADVENTURE_ZONES, QUEST_CATALOG } from '@/features/quests/questCatalog';
import { RoomMapCanvas } from './RoomMapCanvas';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { AdventureZoneId, QuestDefinition } from '@/types/phygital';

export function AdventureZonesPage() {
  const [params, setParams] = useSearchParams();
  const initialZone = (params.get('zone') as AdventureZoneId) || 'potion_gadget_lab';
  const [activeZone, setActiveZone] = useState<AdventureZoneId>(
    ADVENTURE_ZONES.some((z) => z.id === initialZone) ? initialZone : 'potion_gadget_lab'
  );
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mapDrawn, setMapDrawn] = useState(false);
  const [completingCode, setCompletingCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    children,
    activeChildId,
    progress,
    parentQuests,
    refreshDashboard,
    setCompanionReaction,
  } = usePhygitalStore();

  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;
  const zoneMeta = ADVENTURE_ZONES.find((z) => z.id === activeZone)!;
  const zoneQuests = useMemo(
    () => QUEST_CATALOG.filter((q) => q.zone === activeZone),
    [activeZone]
  );

  if (!child) return null;

  function selectZone(id: AdventureZoneId) {
    setActiveZone(id);
    setParams({ zone: id });
    setFeedback(null);
    setError(null);
  }

  function toggleStep(questCode: string, index: number, total: number) {
    setCheckedSteps((prev) => {
      const current = prev[questCode] ? [...prev[questCode]] : Array(total).fill(false);
      current[index] = !current[index];
      return { ...prev, [questCode]: current };
    });
  }

  async function completeBuiltInQuest(quest: QuestDefinition) {
    if (!child) return;
    setCompletingCode(quest.code);
    setError(null);
    setFeedback(null);
    try {
      const res = await phygitalApi.completeQuest({
        childId: child.id,
        questZone: quest.zone,
        questCode: quest.code,
        questTitle: quest.title_en,
        questCategory: quest.category,
        aiSummary: notes[quest.code]?.trim() || `Completed ${quest.title_en} in the real world.`,
      });
      await refreshDashboard();
      setCompanionReaction('celebration', [
        {
          character: zoneMeta.companion === 'maya' ? 'maya' : 'leo',
          emotion: 'amazed',
          text_en: `Bravo! You earned +${res.awardedXp} XP on "${quest.title_en}"!`,
          text_bn: `শাবাশ! তুমি "${quest.title_bn}" শেষ করে +${res.awardedXp} XP পেয়েছ!`,
        },
      ]);
      setFeedback(
        `Quest complete! +${res.awardedXp} XP earned${
          res.unlockedBadge ? ` & unlocked badge: ${res.unlockedBadge}` : ''
        }!`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompletingCode(null);
    }
  }

  async function completeParentAssignedQuest(pqId: string, title: string) {
    if (!child) return;
    setCompletingCode(pqId);
    setError(null);
    try {
      const res = await phygitalApi.completeQuest({
        childId: child.id,
        questZone: 'daily_hero_training',
        questCode: `parent_${pqId}`,
        questTitle: title,
        questCategory: 'parent_habit',
        parentQuestId: pqId,
        aiSummary: 'Completed parent-assigned real-world mission.',
      });
      await refreshDashboard();
      setFeedback(`Awesome! Parent mission "${title}" completed (+${res.awardedXp} XP)!`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompletingCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Adventure Zones</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Pick a storybook world—no boring textbooks, only hands-on real-world discovery!
        </p>
      </div>

      {/* Zone Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Adventure Zones">
        {ADVENTURE_ZONES.map((zone) => {
          const active = zone.id === activeZone;
          return (
            <button
              key={zone.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectZone(zone.id)}
              className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? 'border-terracotta bg-terracotta text-white shadow-sm'
                  : 'border-earth/15 bg-cardwarm text-ink hover:bg-white'
              }`}
            >
              {child.preferred_language === 'bn' ? zone.name_bn : zone.name_en}
            </button>
          );
        })}
      </div>

      {/* Zone Banner */}
      <div className={`storybook-card border-2 p-5 ${zoneMeta.accentBg} ${zoneMeta.accentBorder}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink">
              <BilingualText
                language={child.preferred_language}
                en={zoneMeta.name_en}
                bn={zoneMeta.name_bn}
              />
            </h2>
            <p className="mt-1 text-sm text-earth">
              <BilingualText
                language={child.preferred_language}
                en={zoneMeta.tagline_en}
                bn={zoneMeta.tagline_bn}
              />
            </p>
          </div>

          {activeZone === 'time_travelers_attic' && (
            <Link
              to="/voice-capsules"
              className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-4 py-2 text-sm text-white"
            >
              Open Voice Capsules
            </Link>
          )}
          {activeZone === 'word_weavers_treehouse' && (
            <Link
              to="/reverse-tutoring"
              className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-4 py-2 text-sm text-white"
            >
              Teach Leo &amp; Maya Aloud
            </Link>
          )}
          {activeZone === 'daily_hero_training' && (
            <Link
              to="/habit-mirror"
              className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-4 py-2 text-sm text-white"
            >
              Open AR Habit Mirror
            </Link>
          )}
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border-2 border-sage bg-sage/25 px-4 py-3 text-sm font-bold text-ink">
          <CheckCircle2 className="mr-2 inline h-4 w-4 text-ink" />
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-terracotta/15 px-4 py-3 text-sm font-bold text-terracotta">
          {error}
        </div>
      )}

      {/* Parent-Assigned Quests inside Daily Hero Training */}
      {activeZone === 'daily_hero_training' && (
        <div className="storybook-card p-5">
          <h3 className="text-lg font-bold text-ink">Parent-Assigned Real-Life Missions</h3>
          {parentQuests.filter((q) => q.status === 'pending').length === 0 ? (
            <p className="mt-2 text-sm text-earth">
              No pending parent missions right now. Parents can add custom quests in the Parent Dashboard!
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {parentQuests
                .filter((q) => q.status === 'pending')
                .map((pq) => (
                  <div key={pq.id} className="rounded-2xl border border-earth/15 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-ink">{pq.title}</h4>
                      <span className="rounded-full bg-sun/45 px-2.5 py-0.5 text-xs font-extrabold text-ink">
                        +{pq.reward_xp} XP
                      </span>
                    </div>
                    {pq.description && <p className="mt-1 text-xs text-earth">{pq.description}</p>}
                    <button
                      type="button"
                      disabled={completingCode === pq.id}
                      onClick={() => void completeParentAssignedQuest(pq.id, pq.title)}
                      className="storybook-pill-btn mt-3 bg-sage px-4 py-2 text-xs text-ink"
                    >
                      {completingCode === pq.id ? 'Saving...' : 'Mark Mission Done'}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Zone Quests */}
      <div className="grid gap-5 md:grid-cols-2">
        {zoneQuests.map((quest) => {
          const completedCount = progress.filter((p) => p.quest_code === quest.code).length;
          const steps = child.preferred_language === 'bn' ? quest.steps_bn : quest.steps_en;
          const stepChecks = checkedSteps[quest.code] ?? Array(steps.length).fill(false);

          return (
            <div key={quest.code} className="storybook-card flex flex-col justify-between p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-terracotta">
                    +{quest.xp} XP
                  </span>
                  {completedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage/35 px-3 py-1 text-xs font-bold text-ink">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done {completedCount}×
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-ink">
                  <BilingualText
                    language={child.preferred_language}
                    en={quest.title_en}
                    bn={quest.title_bn}
                  />
                </h3>
                <p className="text-sm text-earth">
                  <BilingualText
                    language={child.preferred_language}
                    en={quest.description_en}
                    bn={quest.description_bn}
                  />
                </p>

                {/* Age-adapted hint */}
                <div className="rounded-2xl bg-sun/25 px-3.5 py-2.5 text-xs font-bold text-ink">
                  Tip for your age group: {quest.age_hint[child.age_group]}
                </div>

                {/* Safety Notice */}
                {quest.safety_en && (
                  <div className="flex items-start gap-2 rounded-2xl bg-terracotta/10 px-3.5 py-2.5 text-xs font-semibold text-ink">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                    <BilingualText
                      language={child.preferred_language}
                      en={quest.safety_en}
                      bn={quest.safety_bn}
                    />
                  </div>
                )}

                {/* Interactive Checklist */}
                <div className="space-y-2 pt-1">
                  {steps.map((stepText, idx) => (
                    <label
                      key={idx}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/85 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(stepChecks[idx])}
                        onChange={() => toggleStep(quest.code, idx, steps.length)}
                        className="mt-0.5 h-4 w-4 accent-terracotta"
                      />
                      <span className={stepChecks[idx] ? 'line-through text-earth/70' : 'text-ink'}>
                        {stepText}
                      </span>
                    </label>
                  ))}
                </div>

                {quest.interactive_type === 'map_draw' && (
                  <RoomMapCanvas onSaveSnapshot={setMapDrawn} />
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold text-earth">
                    What did you discover? (Optional note for Leo &amp; Maya)
                  </label>
                  <input
                    type="text"
                    value={notes[quest.code] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [quest.code]: e.target.value }))}
                    placeholder="Share a quick observation..."
                    className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={
                  completingCode === quest.code ||
                  (quest.interactive_type === 'map_draw' && !mapDrawn && !stepChecks.every(Boolean))
                }
                onClick={() => void completeBuiltInQuest(quest)}
                className="storybook-pill-btn mt-4 flex w-full items-center justify-center gap-2 bg-terracotta px-5 py-2.5 text-sm text-white shadow-tactile disabled:opacity-45"
              >
                <Sparkles className="h-4 w-4" />
                {completingCode === quest.code
                  ? 'Recording Discovery...'
                  : 'Complete Real-World Quest'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
