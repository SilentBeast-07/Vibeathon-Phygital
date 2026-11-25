import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Info, Sparkles, Wand2 } from 'lucide-react';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';

const HABITS = [
  { id: 'wash_hands', title: 'Handwashing Scrub', monster: 'Bubbly Germ Gremlin', xp: 15 },
  { id: 'tidy_desk', title: 'Desk Organization', monster: 'Paper-Pile Clutter Monster', xp: 15 },
  { id: 'sort_waste', title: 'Eco Waste Sorting', monster: 'Mixed-Bin Rascal', xp: 15 },
  { id: 'brush_teeth', title: '2-Minute Toothbrushing', monster: 'Sugar-Plaque Imp', xp: 15 },
];

export function HabitMirrorPage() {
  const { children, activeChildId, refreshDashboard } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedHabit, setSelectedHabit] = useState(HABITS[0]);
  const [mirrorActive, setMirrorActive] = useState(false);
  const [monsterVanished, setMonsterVanished] = useState(false);
  const [parentConfirmed, setParentConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function toggleMirror() {
    setError(null);
    if (mirrorActive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMirrorActive(false);
      return;
    }
    if (!child?.permissions.camera_enabled || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera is unavailable or paused. You can still confirm the habit with a parent below!');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMirrorActive(true);
    } catch {
      setError('Camera permission denied. Use parent confirmation below once finished!');
    }
  }

  async function completeHabit() {
    if (!child) return;
    try {
      await phygitalApi.completeQuest({
        childId: child.id,
        questZone: 'daily_hero_training',
        questCode: `habit_${selectedHabit.id}`,
        questTitle: `AR Habit Mirror: ${selectedHabit.title}`,
        questCategory: 'simple',
        aiSummary: `Completed ${selectedHabit.title} habit challenge with AR Habit Mirror.`,
      });
      setMonsterVanished(true);
      setCompleted(true);
      await refreshDashboard();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!child) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">AR Habit Mirror</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Spot the playful Clutter &amp; Germ creatures in the mirror, complete your real-world habit, and watch them poof away!
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {HABITS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => {
              setSelectedHabit(h);
              setMonsterVanished(false);
              setCompleted(false);
            }}
            className={`rounded-full border-2 px-4 py-2 text-xs font-extrabold ${
              selectedHabit.id === h.id
                ? 'border-terracotta bg-terracotta text-white'
                : 'border-earth/15 bg-cardwarm text-ink'
            }`}
          >
            {h.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Mirror + Playful AR Overlay */}
        <div className="storybook-card space-y-4 p-5">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-earth/15 bg-ink/5">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full -scale-x-100 object-cover ${mirrorActive ? 'block' : 'hidden'}`}
            />
            {!mirrorActive && (
              <div className="p-4 text-center">
                <Camera className="mx-auto h-10 w-10 text-earth/60" />
                <p className="mt-2 text-xs font-bold text-earth">
                  Tap Open Habit Mirror to preview AR creature overlay
                </p>
              </div>
            )}

            {/* Playful SVG Creature Overlay */}
            {!monsterVanished ? (
              <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-center rounded-2xl bg-white/85 p-2.5 shadow-md">
                <svg viewBox="0 0 64 64" className="h-14 w-14 animate-bounce">
                  <circle cx="32" cy="34" r="20" fill="#A5B49A" stroke="#4A3525" strokeWidth="3" />
                  <circle cx="25" cy="30" r="3.5" fill="#4A3525" />
                  <circle cx="39" cy="30" r="3.5" fill="#4A3525" />
                  <path d="M24 41 Q32 36 40 41" fill="none" stroke="#4A3525" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-extrabold text-ink">{selectedHabit.monster}</span>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-sage/35">
                <div className="rounded-2xl bg-white px-4 py-2 text-sm font-extrabold text-ink shadow">
                  <Sparkles className="mr-1 inline h-4 w-4 text-terracotta" />
                  Creature Banished!
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void toggleMirror()}
            className="storybook-pill-btn flex w-full items-center justify-center gap-2 bg-sun px-5 py-2.5 text-sm text-ink shadow-tactile"
          >
            <Wand2 className="h-4 w-4" />
            {mirrorActive ? 'Close Mirror Camera' : 'Open AR Habit Mirror'}
          </button>
        </div>

        {/* Habit Completion & Disclaimer */}
        <div className="storybook-card flex flex-col justify-between space-y-4 p-5">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-ink">{selectedHabit.title}</h2>
            <p className="text-sm text-earth">
              Complete your real-world habit first, then ask a parent to tap confirm or verify!
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3.5 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={parentConfirmed}
                onChange={(e) => setParentConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-terracotta"
              />
              <span>Parent / Explorer Confirmation: I completed {selectedHabit.title} in real life!</span>
            </label>
          </div>

          {error && <p className="text-sm font-bold text-terracotta">{error}</p>}

          {completed ? (
            <div className="rounded-2xl bg-sage/35 px-4 py-3 text-sm font-bold text-ink">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              Great habit! +10 XP earned!
            </div>
          ) : (
            <button
              type="button"
              disabled={!parentConfirmed}
              onClick={() => void completeHabit()}
              className="storybook-pill-btn w-full bg-terracotta px-6 py-3 text-sm text-white shadow-tactile disabled:opacity-45"
            >
              Banish {selectedHabit.monster}!
            </button>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 text-[11px] text-earth">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" />
            <p>
              <strong>Web MVP Note:</strong> This mirror uses lightweight playful SVG overlays and does
              not make medical or hygiene claims. Native ARKit/ARCore integrations can replace the
              overlay adapter in mobile builds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
