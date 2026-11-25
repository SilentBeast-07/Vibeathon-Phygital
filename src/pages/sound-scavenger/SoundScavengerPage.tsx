import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mic, Radio, ShieldAlert, Square, Wind } from 'lucide-react';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';

const SOUND_MISSIONS = [
  { id: 'bird', label: 'Listen for a Bird Outside', hint: 'Birds often sing in bright mid-to-high pitches!' },
  { id: 'water', label: 'Find Running Water', hint: 'Gentle steady rushing sound near a tap or rain.' },
  { id: 'fan', label: 'Ceiling Fan Breeze Hum', hint: 'Steady low-frequency whoosh overhead.' },
];

export function SoundScavengerPage() {
  const { children, activeChildId, refreshDashboard } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const [listening, setListening] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [dominantBand, setDominantBand] = useState<'Quiet' | 'Low Hum' | 'Calm Voice' | 'Bright Chirp'>('Quiet');
  const [balloonHeight, setBalloonHeight] = useState(25);
  const [steadySeconds, setSteadySeconds] = useState(0);
  const [selectedMission, setSelectedMission] = useState(SOUND_MISSIONS[0]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  function stopAudio() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setListening(false);
  }

  async function startLocalSoundAnalyser() {
    if (!child) return;
    setError(null);
    if (!child.permissions.microphone_enabled) {
      setError('Microphone is disabled in Parental Controls.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live microphone audio analysis is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setListening(true);
      let lastTick = performance.now();

      const loop = (now: number) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setVolumeLevel(normalized);

        const lowEnergy = dataArray.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
        const midEnergy = dataArray.slice(12, 40).reduce((a, b) => a + b, 0) / 28;
        const highEnergy = dataArray.slice(40, 90).reduce((a, b) => a + b, 0) / 50;

        if (normalized < 6) setDominantBand('Quiet');
        else if (highEnergy > midEnergy && highEnergy > lowEnergy) setDominantBand('Bright Chirp');
        else if (lowEnergy > midEnergy * 1.25) setDominantBand('Low Hum');
        else setDominantBand('Calm Voice');

        // Calm steady voice (15% - 65%) floats Maya's hot-air balloon gently up!
        const dt = (now - lastTick) / 1000;
        lastTick = now;
        const inCalmZone = normalized >= 12 && normalized <= 68;
        setBalloonHeight((h) => Math.max(10, Math.min(90, h + (inCalmZone ? 16 : -10) * dt)));
        if (inCalmZone) {
          setSteadySeconds((s) => Number((s + dt).toFixed(1)));
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError('Microphone permission was denied.');
    }
  }

  async function claimSoundQuest() {
    if (!child) return;
    try {
      await phygitalApi.completeQuest({
        childId: child.id,
        questZone: 'world_explorers_compass',
        questCode: `sound_${selectedMission.id}`,
        questTitle: `Sound Scavenger: ${selectedMission.label}`,
        questCategory: 'discovery',
        aiSummary: 'Used local browser audio meter for Sound-Scavenger & Calm Balloon.',
      });
      setCompleted(true);
      await refreshDashboard();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!child) return null;

  if (!child.permissions.microphone_enabled) {
    return (
      <div className="storybook-card mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-terracotta" />
        <h1 className="mt-3 text-2xl font-bold text-ink">Microphone Paused</h1>
        <p className="mt-2 text-sm text-earth">
          Sound-Scavenger requires microphone permission enabled by a parent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Sound-Scavenger &amp; Calm Balloon</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          All sound sensing happens live in your browser—nothing is recorded continuously or uploaded!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="storybook-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Environmental Sound Meter</h2>
            <Radio className="h-5 w-5 text-terracotta" />
          </div>

          <div className="space-y-2">
            {SOUND_MISSIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMission(m);
                  setCompleted(false);
                }}
                className={`w-full rounded-2xl border p-3 text-left text-sm ${
                  selectedMission.id === m.id
                    ? 'border-terracotta bg-white font-bold text-ink'
                    : 'border-earth/15 bg-white/60 text-earth'
                }`}
              >
                <p>{m.label}</p>
                <p className="mt-0.5 text-xs font-normal text-earth">{m.hint}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-4">
            <div className="flex justify-between text-xs font-bold text-earth">
              <span>Live Sound Energy: {volumeLevel}%</span>
              <span className="text-terracotta">{dominantBand}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-cardwarm">
              <div
                className="h-full rounded-full bg-terracotta transition-all duration-75"
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (listening ? stopAudio() : void startLocalSoundAnalyser())}
              className={`storybook-pill-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-tactile ${
                listening ? 'bg-terracotta text-white' : 'bg-sun text-ink'
              }`}
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? 'Stop Listening' : 'Start Sound Sensor'}
            </button>

            <button
              type="button"
              disabled={completed}
              onClick={() => void claimSoundQuest()}
              className="storybook-pill-btn inline-flex items-center gap-2 bg-sage px-5 py-2.5 text-sm text-ink disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {completed ? 'Quest Saved (+20 XP)' : 'I Found This Sound!'}
            </button>
          </div>
          {error && <p className="text-sm font-bold text-terracotta">{error}</p>}
        </div>

        {/* Maya's Calm-Voice Hot-Air Balloon */}
        <div className="storybook-card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink">Maya&rsquo;s Calm Hot-Air Balloon</h2>
              <Wind className="h-5 w-5 text-sage" />
            </div>
            <p className="mt-1 text-xs font-semibold text-earth">
              Speak softly and steadily (not shouting!) to float Maya&rsquo;s balloon smoothly through the clouds.
            </p>
          </div>

          <div className="relative my-4 h-56 overflow-hidden rounded-2xl border-2 border-earth/15 bg-gradient-to-b from-sun/25 to-sage/25">
            <div
              className="absolute left-1/2 -translate-x-1/2 transition-all duration-150"
              style={{ bottom: `${balloonHeight}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="h-14 w-12 rounded-t-full rounded-b-2xl border-2 border-ink bg-terracotta shadow-sm" />
                <div className="h-3 w-0.5 bg-ink" />
                <div className="h-5 w-7 rounded-b-lg border-2 border-ink bg-sun" />
              </div>
            </div>
          </div>

          <p className="rounded-xl bg-white px-4 py-2 text-center text-xs font-bold text-ink">
            Calm steady flight time: {steadySeconds.toFixed(1)}s
          </p>
        </div>
      </div>
    </div>
  );
}
