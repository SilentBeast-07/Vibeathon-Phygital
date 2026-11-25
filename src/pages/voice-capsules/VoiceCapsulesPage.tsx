import { useRef, useState } from 'react';
import { BookHeart, CheckCircle2, Mic, ShieldAlert, Square } from 'lucide-react';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { MemoryCard } from '@/types/phygital';

const PROMPTS = [
  'What games did you play when you were my age?',
  'What was your favorite festival food growing up?',
  'Tell me a short Bengali folk story or riddle from childhood!',
];

export function VoiceCapsulesPage() {
  const { children, activeChildId, refreshDashboard, setCompanionReaction } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const [adultConsent, setAdultConsent] = useState(false);
  const [storyTopic, setStoryTopic] = useState(PROMPTS[0]);
  const [storySummary, setStorySummary] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<'audio/webm' | 'audio/ogg'>('audio/webm');
  const [saving, setSaving] = useState(false);
  const [savedCard, setSavedCard] = useState<MemoryCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  if (!child) return null;

  if (!child.permissions.voice_capsules_enabled) {
    return (
      <div className="storybook-card mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-terracotta" />
        <h1 className="mt-3 text-2xl font-bold text-ink">Voice Capsules Disabled</h1>
        <p className="mt-2 text-sm text-earth">
          Voice Capsules are turned off in Parental Controls.
        </p>
      </div>
    );
  }

  async function toggleRecord() {
    if (!child) return;
    setError(null);
    if (!adultConsent) {
      setError('Please ask the participating elder/adult for permission and check the consent box first.');
      return;
    }
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!child.permissions.microphone_enabled || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is unavailable or disabled. You can write the family story summary below!');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      setAudioMime(mimeType);
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => setAudioBase64(String(reader.result));
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone permission was denied. You can still type the story below!');
    }
  }

  async function handleSaveCapsule() {
    if (!child || !adultConsent || storySummary.trim().length < 5) return;
    setSaving(true);
    setError(null);
    try {
      const res = await phygitalApi.saveVoiceCapsule({
        childId: child.id,
        adultConsentConfirmed: true,
        storyTopic: storyTopic.trim(),
        storySummary: storySummary.trim(),
        audioBase64: audioBase64 || undefined,
        mimeType: audioBase64 ? audioMime : undefined,
      });
      setSavedCard(res.card);
      await refreshDashboard();
      setCompanionReaction('celebration', [
        {
          character: 'maya',
          emotion: 'amazed',
          text_en: `What a treasure! We saved your family Memory Card and awarded +${res.awardedXp} XP!`,
          text_bn: `কী দারুণ স্মৃতি! পারিবারিক মেমরি কার্ড তৈরি হয়েছে আর তুমি +${res.awardedXp} XP পেয়েছ!`,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Intergenerational Voice Capsules</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Interview a grandparent or elder! Any optional voice recording auto-deletes after 48 hours while your Memory Card stays forever.
        </p>
      </div>

      <div className="storybook-card space-y-5 p-6">
        <div>
          <label className="mb-2 block text-xs font-extrabold uppercase text-earth">
            Choose a Conversation Prompt
          </label>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setStoryTopic(p)}
                className={`rounded-2xl border px-3.5 py-2 text-left text-xs font-bold ${
                  storyTopic === p ? 'border-terracotta bg-white text-ink' : 'border-earth/15 bg-white/60 text-earth'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Mandatory Adult Participant Consent */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-sage bg-sage/20 p-4">
          <input
            type="checkbox"
            checked={adultConsent}
            onChange={(e) => setAdultConsent(e.target.checked)}
            className="mt-1 h-5 w-5 accent-terracotta"
          />
          <span className="text-sm font-bold text-ink">
            Adult Participant Permission Confirmed: The elder/adult joining this conversation agrees to share this story (optional voice clips expire in 48 hours).
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!adultConsent}
            onClick={() => void toggleRecord()}
            className={`storybook-pill-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-tactile disabled:opacity-45 ${
              recording ? 'bg-terracotta text-white' : 'bg-sun text-ink'
            }`}
          >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recording ? 'Stop Recording' : audioBase64 ? 'Re-record Story Audio' : 'Record Conversation (Optional)'}
          </button>
          {audioBase64 && (
            <span className="rounded-full bg-sage/35 px-3 py-1 text-xs font-bold text-ink">
              Audio clip ready (48h vault)
            </span>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-earth">
            Story Summary (Required — write together or summarize what you heard!)
          </label>
          <textarea
            rows={4}
            value={storySummary}
            onChange={(e) => setStorySummary(e.target.value)}
            placeholder="e.g., Dadu told me about playing Kanamachi and spinning wooden tops with friends after school!"
            className="w-full rounded-2xl border-2 border-earth/20 bg-white p-3.5 text-sm text-ink"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-terracotta/15 px-3 py-2 text-sm font-bold text-terracotta">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={saving || !adultConsent || storySummary.trim().length < 5}
          onClick={() => void handleSaveCapsule()}
          className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-6 py-3 text-sm text-white shadow-tactile disabled:opacity-45"
        >
          <BookHeart className="h-4 w-4" />
          {saving ? 'Creating Memory Card...' : 'Create Heritage Memory Card (+30 XP)'}
        </button>

        {savedCard && (
          <div className="rounded-2xl border-2 border-sage bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <CheckCircle2 className="h-5 w-5 text-sage" />
              Memory Card Unlocked &amp; Saved!
            </div>
            <h3 className="mt-2 text-xl font-bold text-ink">{savedCard.title_en}</h3>
            <p className="mt-1 text-sm text-earth">{savedCard.summary_en}</p>
            <p className="mt-2 rounded-xl bg-cardwarm p-3 text-xs font-bold text-ink">
              Follow-up Question: {savedCard.follow_up_en}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
