import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Info, Sparkles, Sun } from 'lucide-react';
import { SunBatteryGauge } from '@/components/common/SunBatteryGauge';
import { OFFLINE_MISSION_TEMPLATES } from '@/features/quests/questCatalog';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';

export function OfflineMissionsPage() {
  const {
    children,
    activeChildId,
    activeOfflineMission,
    refreshDashboard,
    setCompanionReaction,
  } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const [nowMs, setNowMs] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    const onVisibility = () => setNowMs(Date.now());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!child) return null;

  async function handleStart(title: string, minutes: 15 | 20 | 30) {
    if (!child) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await phygitalApi.startOfflineMission({
        childId: child.id,
        missionTitle: title,
        targetMinutes: minutes,
      });
      await refreshDashboard();
      setMessage('Offline mission started! Put down the device and enjoy the real world.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!child || !activeOfflineMission) return;
    setBusy(true);
    setError(null);
    try {
      const res = await phygitalApi.completeOfflineMission({
        childId: child.id,
        missionId: activeOfflineMission.id,
      });
      await refreshDashboard();
      setCompanionReaction('celebration', [
        {
          character: 'maya',
          emotion: 'amazed',
          text_en: `Welcome back! Our Sun-Battery gained energy and you earned +${res.awardedXp} XP!`,
          text_bn: `স্বাগতম! আমাদের সান-ব্যাটারি চার্জ হয়েছে আর তুমি +${res.awardedXp} XP পেয়েছ!`,
        },
      ]);
      setMessage(`Sun-Battery charged! +${res.awardedXp} XP awarded!`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const elapsedSeconds = activeOfflineMission
    ? Math.max(0, Math.floor((nowMs - Date.parse(activeOfflineMission.started_at)) / 1000))
    : 0;
  const targetSeconds = activeOfflineMission ? activeOfflineMission.target_minutes * 60 : 0;
  const readyToCollect = activeOfflineMission ? elapsedSeconds >= targetSeconds : false;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Offline Sun-Battery Missions</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Leo &amp; Maya&rsquo;s world charges up when you step AWAY from the screen!
        </p>
      </div>

      <div className="storybook-card p-6">
        <SunBatteryGauge level={child.sun_battery_level} />
      </div>

      {activeOfflineMission && (
        <div className="storybook-card border-2 border-sun bg-sun/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-terracotta">
                <Clock className="h-3.5 w-3.5" />
                Active {activeOfflineMission.target_minutes}-Min Offline Mission
              </span>
              <h2 className="mt-2 text-2xl font-bold text-ink">
                {activeOfflineMission.mission_title}
              </h2>
              <p className="mt-1 text-sm text-earth">
                Elapsed timestamp time: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s /{' '}
                {activeOfflineMission.target_minutes}m 00s
              </p>
            </div>

            <button
              type="button"
              disabled={busy || !readyToCollect}
              onClick={() => void handleComplete()}
              className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-6 py-3 text-sm text-white shadow-tactile disabled:opacity-45"
            >
              <Sparkles className="h-4 w-4" />
              {readyToCollect
                ? 'Collect Sun-Battery Energy!'
                : `Keep Exploring (${Math.ceil((targetSeconds - elapsedSeconds) / 60)}m left)`}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-2xl bg-sage/30 px-4 py-3 text-sm font-bold text-ink">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-terracotta/15 px-4 py-3 text-sm font-bold text-terracotta">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {OFFLINE_MISSION_TEMPLATES.map((tpl) => (
          <div key={tpl.id} className="storybook-card flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-sun/45 px-3 py-1 text-xs font-extrabold text-ink">
                  {tpl.minutes} Minutes
                </span>
                <span className="text-xs font-extrabold text-terracotta">+{tpl.energy}% Sun</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-ink">{tpl.title_en}</h3>
              <p className="mt-1 text-xs font-semibold text-earth">{tpl.title_bn}</p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStart(tpl.title_en, tpl.minutes)}
              className="storybook-pill-btn mt-4 flex w-full items-center justify-center gap-2 bg-terracotta px-4 py-2.5 text-sm text-white shadow-tactile disabled:opacity-50"
            >
              <Sun className="h-4 w-4" />
              Start {tpl.minutes}m Mission
            </button>
          </div>
        ))}
      </div>

      {/* Honest PWA Limitation Disclosure */}
      <div className="flex items-start gap-3 rounded-2xl border border-earth/20 bg-white/80 p-4 text-xs text-earth">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
        <p>
          <strong>Web PWA Transparency:</strong> Browser PWAs measure real elapsed time between your
          mission start timestamp and return timestamp via the Page Visibility API, but browsers cannot
          detect hardware screen-lock state directly. Native mobile builds can integrate iOS
          DeviceActivity and Android UsageStatsManager via our `offline-battery` adapter.
        </p>
      </div>
    </div>
  );
}
