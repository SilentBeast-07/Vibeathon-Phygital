import { Award, BookOpen, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { SunBatteryGauge } from '@/components/common/SunBatteryGauge';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import { xpBoundsForLevel } from '@/utils/i18n';

export function RewardsPage() {
  const { children, activeChildId, badges, progress, memoryCards } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  if (!child) return null;

  const { currentFloor, nextTarget } = xpBoundsForLevel(child.level);
  const unlockedCount = badges.filter((b) => Boolean(b.unlocked_at)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">My Rewards &amp; Memory Book</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Every badge celebrates curiosity, kindness, and real-world action—never screen addiction!
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="storybook-card p-5">
          <p className="text-xs font-extrabold uppercase text-earth">Explorer Level</p>
          <p className="mt-1 text-3xl font-bold text-ink">Level {child.level}</p>
          <p className="mt-1 text-xs font-bold text-terracotta">
            {child.total_xp} XP (Next level at {nextTarget} XP, started at {currentFloor} XP)
          </p>
        </div>
        <div className="storybook-card p-5">
          <p className="text-xs font-extrabold uppercase text-earth">Badges Collected</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {unlockedCount} / {badges.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-earth">Across all 5 Adventure Zones</p>
        </div>
        <div className="storybook-card flex flex-col justify-center p-5">
          <SunBatteryGauge level={child.sun_battery_level} />
        </div>
      </section>

      {/* Badges Grid */}
      <section className="storybook-card p-5">
        <h2 className="mb-4 text-xl font-bold text-ink">Storybook Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => {
            const unlocked = Boolean(badge.unlocked_at);
            return (
              <div
                key={badge.badge_code}
                className={`rounded-2xl border-2 p-4 ${
                  unlocked ? 'border-sun bg-white shadow-sm' : 'border-earth/10 bg-white/50 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      unlocked ? 'bg-sun/55 text-ink' : 'bg-cardwarm text-earth'
                    }`}
                  >
                    {unlocked ? <Award className="h-6 w-6 text-terracotta" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                      unlocked ? 'bg-sage/35 text-ink' : 'bg-cardwarm text-earth'
                    }`}
                  >
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-ink">{badge.badge_name}</h3>
                <p className="mt-1 text-xs text-earth">{badge.badge_description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Family Memory Cards */}
      <section className="storybook-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-terracotta" />
          <h2 className="text-xl font-bold text-ink">Illustrated Family Memory Cards</h2>
        </div>
        {memoryCards.length === 0 ? (
          <p className="rounded-2xl bg-white/80 p-4 text-sm text-earth">
            No Memory Cards yet. Visit Time-Traveler&rsquo;s Attic / Voice Capsules to save a story from an elder!
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {memoryCards.map((card) => (
              <div key={card.id} className="rounded-2xl border-2 border-terracotta/25 bg-white p-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-sun/40 px-2.5 py-0.5 text-xs font-bold text-ink">
                  <Sparkles className="h-3 w-3 text-terracotta" />
                  Heritage Memory
                </span>
                <h3 className="mt-2 text-lg font-bold text-ink">{card.title_en}</h3>
                <p className="text-xs font-semibold text-earth">{card.title_bn}</p>
                <p className="mt-2 text-sm text-ink">{card.summary_en}</p>
                <p className="mt-2 rounded-xl bg-cardwarm p-2.5 text-xs font-semibold text-earth">
                  Next Question: {card.follow_up_en}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed Quest Log */}
      <section className="storybook-card p-5">
        <h2 className="mb-3 text-xl font-bold text-ink">Adventure Journal</h2>
        {progress.length === 0 ? (
          <p className="text-sm text-earth">Your completed adventures will appear here!</p>
        ) : (
          <ul className="space-y-2">
            {progress.slice(0, 10).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" />
                  <div>
                    <p className="font-bold text-ink">{item.quest_title}</p>
                    <p className="text-xs text-earth">{item.ai_evaluation_summary}</p>
                  </div>
                </div>
                <span className="rounded-full bg-sun/40 px-3 py-1 text-xs font-extrabold text-ink">
                  +{item.xp_awarded} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
