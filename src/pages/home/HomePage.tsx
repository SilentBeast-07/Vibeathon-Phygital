import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Camera,
  CheckCircle2,
  Compass,
  Mic,
  Radio,
  Sparkles,
  Sun,
  Users,
  Wand2,
} from 'lucide-react';
import { CompanionStage3D } from '@/components/characters/CompanionStage3D';
import { BilingualText } from '@/components/common/BilingualText';
import { SunBatteryGauge } from '@/components/common/SunBatteryGauge';
import { ADVENTURE_ZONES, QUEST_CATALOG } from '@/features/quests/questCatalog';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import { xpBoundsForLevel } from '@/utils/i18n';

export function HomePage() {
  const navigate = useNavigate();
  const {
    children,
    activeChildId,
    progress,
    parentQuests,
    badges,
    companionAnimation,
    companionTurns,
    setCompanionReaction,
  } = usePhygitalStore();

  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const recentBadges = useMemo(() => badges.filter((b) => Boolean(b.unlocked_at)).slice(0, 3), [badges]);
  const pendingParentQuests = useMemo(
    () => parentQuests.filter((q) => q.status === 'pending'),
    [parentQuests]
  );

  if (!child) {
    return (
      <div className="storybook-card p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">No Explorer Profile Yet</h1>
        <p className="mt-2 text-earth">Let&rsquo;s create an explorer profile in onboarding or Parent Dashboard.</p>
        <Link
          to="/onboarding"
          className="storybook-pill-btn mt-4 inline-flex items-center gap-2 bg-terracotta px-6 py-3 text-white"
        >
          Open Onboarding
        </Link>
      </div>
    );
  }

  const { currentFloor, nextTarget } = xpBoundsForLevel(child.level);
  const levelPct = Math.min(
    100,
    Math.max(4, Math.round(((child.total_xp - currentFloor) / Math.max(1, nextTarget - currentFloor)) * 100))
  );
  const suggestedQuest =
    QUEST_CATALOG.find((q) => !progress.some((p) => p.quest_code === q.code)) ?? QUEST_CATALOG[0];

  const todayCount = progress.filter(
    (p) => p.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  function handleTapCharacter(who: 'leo' | 'maya') {
    if (who === 'leo') {
      setCompanionReaction('thinking', [
        {
          character: 'leo',
          emotion: 'curious',
          text_en: 'Wait! Let me check my notes! What real-world clue should we investigate next?',
          text_bn: 'একটু দাঁড়াও! আমার নোটবুক দেখি! আজ কোন বাস্তব রহস্য আমরা খুঁজব?',
        },
      ]);
    } else {
      setCompanionReaction('happy', [
        {
          character: 'maya',
          emotion: 'happy',
          text_en: "Come on! Let's discover something wonderful off-screen today!",
          text_bn: 'চলো! আজ স্ক্রিনের বাইরে দারুণ কিছু আবিষ্কার করি!',
        },
      ]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner + Greeting */}
      <section className="storybook-card overflow-hidden p-5 sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-sun/45 px-3.5 py-1 text-xs font-extrabold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-terracotta" />
              <span>Your next adventure starts in the real world!</span>
            </div>

            <h1 className="text-3xl font-bold text-ink sm:text-4xl">
              Hello, {child.nickname}!
            </h1>
            <p className="text-sm font-semibold text-earth">
              Level {child.level} Explorer · {child.total_xp} XP ·{' '}
              {child.age_group === 'junior'
                ? 'Junior Explorers (6–8)'
                : child.age_group === 'curious'
                  ? 'Curious Discoverers (9–11)'
                  : 'Young Trailblazers (12–14)'}
            </p>

            {/* Level XP Bar */}
            <div className="rounded-2xl bg-white/85 p-3.5 ring-1 ring-earth/10">
              <div className="flex justify-between text-xs font-bold text-earth">
                <span>Level {child.level} Progress</span>
                <span>
                  {child.total_xp} / {nextTarget} XP
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-cardwarm">
                <div
                  className="h-full rounded-full bg-sage transition-all duration-500"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>

            {/* Sun Battery */}
            <div className="rounded-2xl bg-white/85 p-3.5 ring-1 ring-earth/10">
              <SunBatteryGauge level={child.sun_battery_level} />
              <div className="mt-2 flex justify-end">
                <Link
                  to="/offline-missions"
                  className="text-xs font-extrabold text-terracotta underline"
                >
                  Charge away from screens →
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-6">
            <CompanionStage3D
              animation={companionAnimation}
              lowPower2D={child.permissions.low_power_2d_mode}
              onTapCharacter={handleTapCharacter}
            />
            <div className="space-y-2">
              {companionTurns.map((turn, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-earth/15 bg-white px-4 py-2.5 text-sm shadow-sm"
                >
                  <span className="mr-2 font-extrabold uppercase text-terracotta">
                    {turn.character}:
                  </span>
                  <BilingualText
                    language={child.preferred_language}
                    en={turn.text_en}
                    bn={turn.text_bn}
                    secondaryClassName="mt-0.5 block text-xs font-semibold text-earth"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Interactive Phygital Modes */}
      <section aria-label="Interactive Real-World Tools">
        <h2 className="mb-3 text-xl font-bold text-ink">Explore With Real-World Tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              to: '/scanner',
              title: 'Object-to-Quest Scanner',
              desc: 'Point camera at everyday items',
              icon: Camera,
              bg: 'bg-terracotta/15',
            },
            {
              to: '/reverse-tutoring',
              title: 'Teach Leo & Maya',
              desc: 'Explain Earth science by voice or text',
              icon: Mic,
              bg: 'bg-sun/35',
            },
            {
              to: '/voice-capsules',
              title: 'Family Voice Capsules',
              desc: 'Capture elder stories & memory cards',
              icon: Users,
              bg: 'bg-sage/30',
            },
            {
              to: '/sound-scavenger',
              title: 'Sound-Scavenger',
              desc: 'Listening quests & hot-air balloon',
              icon: Radio,
              bg: 'bg-sun/25',
            },
            {
              to: '/habit-mirror',
              title: 'AR Habit Mirror',
              desc: 'Banish Germ & Clutter Monsters',
              icon: Wand2,
              bg: 'bg-sage/35',
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="storybook-card flex flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-terracotta/50"
              >
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${tool.bg}`}>
                  <Icon className="h-5 w-5 text-ink" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">{tool.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-earth">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Today's Suggested Quest + Daily Habit Progress */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="storybook-card p-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-sun/45 px-3 py-1 text-xs font-extrabold text-ink">
              Today&rsquo;s Suggested Quest
            </span>
            <span className="text-xs font-bold text-terracotta">+{suggestedQuest.xp} XP</span>
          </div>
          <h3 className="mt-3 text-xl font-bold text-ink">
            <BilingualText
              language={child.preferred_language}
              en={suggestedQuest.title_en}
              bn={suggestedQuest.title_bn}
            />
          </h3>
          <p className="mt-2 text-sm text-earth">
            <BilingualText
              language={child.preferred_language}
              en={suggestedQuest.description_en}
              bn={suggestedQuest.description_bn}
            />
          </p>
          <button
            type="button"
            onClick={() => navigate(`/zones?zone=${suggestedQuest.zone}`)}
            className="storybook-pill-btn mt-4 inline-flex items-center gap-2 bg-terracotta px-5 py-2.5 text-sm text-white shadow-tactile"
          >
            <Compass className="h-4 w-4" />
            Start Quest
          </button>
        </div>

        <div className="storybook-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-ink">Daily Habit &amp; Family Quests</h3>
            <span className="rounded-full bg-sage/35 px-3 py-1 text-xs font-extrabold text-ink">
              {todayCount} done today
            </span>
          </div>
          {pendingParentQuests.length === 0 ? (
            <p className="mt-3 text-sm text-earth">
              All parent-assigned quests are complete! Try an Offline Sun-Battery mission next.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingParentQuests.slice(0, 3).map((pq) => (
                <li
                  key={pq.id}
                  className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sage" />
                    <span className="font-bold text-ink">{pq.title}</span>
                  </div>
                  <span className="text-xs font-extrabold text-terracotta">+{pq.reward_xp} XP</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/zones?zone=daily_hero_training"
              className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink ring-1 ring-earth/15"
            >
              Open Daily Hero Training
            </Link>
            <Link
              to="/offline-missions"
              className="inline-flex items-center gap-1 rounded-full bg-sun/45 px-4 py-2 text-xs font-extrabold text-ink"
            >
              <Sun className="h-3.5 w-3.5 text-terracotta" />
              Offline Mission
            </Link>
          </div>
        </div>
      </section>

      {/* Recently Unlocked Badges + Adventure Zone Shortcuts */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="storybook-card p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Recent Badges</h2>
            <Link to="/rewards" className="text-xs font-extrabold text-terracotta underline">
              View All
            </Link>
          </div>
          {recentBadges.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white/80 p-4 text-center text-sm text-earth">
              Complete your first real-world quest to unlock a storybook badge!
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {recentBadges.map((b) => (
                <div key={b.badge_code} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun/45">
                    <Award className="h-5 w-5 text-terracotta" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{b.badge_name}</p>
                    <p className="text-xs text-earth">{b.badge_description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="storybook-card p-5 lg:col-span-7">
          <h2 className="text-xl font-bold text-ink">Five Adventure Zones</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {ADVENTURE_ZONES.map((z) => (
              <Link
                key={z.id}
                to={`/zones?zone=${z.id}`}
                className={`rounded-2xl border-2 p-3.5 transition hover:shadow-sm ${z.accentBg} ${z.accentBorder}`}
              >
                <p className="font-bold text-ink">
                  <BilingualText
                    language={child.preferred_language}
                    en={z.name_en}
                    bn={z.name_bn}
                    secondaryClassName="mt-0.5 block text-xs font-semibold text-earth"
                  />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
