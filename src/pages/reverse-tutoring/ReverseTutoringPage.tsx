import { useRef, useState } from 'react';
import { CheckCircle2, Mic, Send, ShieldAlert, Square } from 'lucide-react';
import { BilingualText } from '@/components/common/BilingualText';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { CompanionDialogueResponse } from '@/types/phygital';

const TOPICS = [
  {
    id: 'rain',
    prompt_en: 'Leo asks: "Why does it rain from clouds in the sky?"',
    prompt_bn: 'লিও জিজ্ঞেস করছে: "আকাশের মেঘ থেকে বৃষ্টি পড়ে কেন?"',
  },
  {
    id: 'leaves',
    prompt_en: 'Maya asks: "Why are most tree leaves green?"',
    prompt_bn: 'মায়া জিজ্ঞেস করছে: "বেশিরভাগ গাছের পাতা সবুজ হয় কেন?"',
  },
  {
    id: 'proverb',
    prompt_en: 'Leo asks: "What does the Bengali proverb \'একতাই বল\' mean in real life?"',
    prompt_bn: 'লিও জিজ্ঞেস করছে: "\'একতাই বল\' কথাটার আসল মানে কী?"',
  },
];

export function ReverseTutoringPage() {
  const { children, activeChildId, refreshDashboard, setCompanionReaction } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [explanation, setExplanation] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState<CompanionDialogueResponse | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  if (!child) return null;

  async function toggleRecording() {
    if (!child) return;
    setError(null);
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!child.permissions.microphone_enabled) {
      setError('Microphone is disabled in Parental Controls. You can type your answer below!');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is unavailable in this browser. Type your explanation below!');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = async () => {
          setTranscribing(true);
          try {
            const res = await phygitalApi.transcribeAudio({
              childId: child.id,
              audioBase64: String(reader.result),
              mimeType: mimeType as 'audio/webm' | 'audio/ogg',
              language: child.preferred_language,
              fallbackText: explanation.trim() || undefined,
              saveEphemeral: false, // immediate cleanup after transcription
            });
            setExplanation(res.transcript);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone permission denied. No worries—type your explanation below!');
    }
  }

  async function submitTeaching() {
    if (!child || !explanation.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await phygitalApi.companionDialogue({
        childId: child.id,
        trigger: 'reverse_tutoring',
        ageGroup: child.age_group,
        language: child.preferred_language,
        questTitle: selectedTopic.prompt_en,
        userMessage: explanation.trim(),
      });
      setReply(res);
      setCompanionReaction(res.animation, res.dialogue_turns);

      if (res.quest_completed) {
        const saved = await phygitalApi.completeQuest({
          childId: child.id,
          questZone: 'word_weavers_treehouse',
          questCode: `tutor_${selectedTopic.id}`,
          questTitle: `Taught Leo & Maya: ${selectedTopic.id}`,
          questCategory: 'speaking',
          aiSummary: res.evaluation_summary || 'Explained Earth concept clearly to Leo & Maya.',
        });
        setXpAwarded(saved.awardedXp);
        await refreshDashboard();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!child.permissions.ai_companion_enabled) {
    return (
      <div className="storybook-card mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-terracotta" />
        <h1 className="mt-3 text-2xl font-bold text-ink">AI Companion Paused</h1>
        <p className="mt-2 text-sm text-earth">
          AI Companion interactions are turned off in Parental Controls.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Reverse Tutoring — Teach Leo &amp; Maya</h1>
        <p className="mt-1 text-sm font-semibold text-earth">
          Leo and Maya are curious about Earth! Speak or type in English, Bengali, or Banglish—every effort counts.
        </p>
      </div>

      {/* Topic Picker */}
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedTopic(t);
              setReply(null);
              setXpAwarded(null);
            }}
            className={`rounded-full border-2 px-4 py-2 text-xs font-extrabold transition ${
              selectedTopic.id === t.id
                ? 'border-terracotta bg-terracotta text-white'
                : 'border-earth/20 bg-cardwarm text-ink hover:bg-white'
            }`}
          >
            {t.id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="storybook-card space-y-4 p-6">
        <div className="rounded-2xl bg-sun/35 p-4">
          <p className="text-lg font-bold text-ink">
            <BilingualText
              language={child.preferred_language}
              en={selectedTopic.prompt_en}
              bn={selectedTopic.prompt_bn}
            />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleRecording()}
            className={`storybook-pill-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-tactile ${
              recording ? 'bg-terracotta text-white' : 'bg-sun text-ink'
            }`}
          >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recording ? 'Stop Recording' : 'Speak Answer'}
          </button>
          {transcribing && <span className="text-xs font-bold text-earth">Transcribing kindly...</span>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-earth">
            Your explanation (English, বাংলা, or typed fallback)
          </label>
          <textarea
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain in your own words with an everyday example!"
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
          disabled={sending || !explanation.trim()}
          onClick={() => void submitTeaching()}
          className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-6 py-3 text-sm text-white shadow-tactile disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Leo & Maya are listening...' : 'Teach Leo & Maya'}
        </button>

        {reply && (
          <div className="space-y-3 border-t border-earth/15 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-earth">
                Companion Response ({reply.mode === 'gemini' ? 'Gemini AI' : 'Development Mode'})
              </span>
              {xpAwarded && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage/35 px-3 py-1 text-xs font-extrabold text-ink">
                  <CheckCircle2 className="h-3.5 w-3.5" />+{xpAwarded} XP Earned!
                </span>
              )}
            </div>
            {reply.dialogue_turns.map((turn, idx) => (
              <div key={idx} className="rounded-2xl bg-white p-4 shadow-sm">
                <span className="mr-2 font-extrabold uppercase text-terracotta">
                  {turn.character}:
                </span>
                <BilingualText
                  language={child.preferred_language}
                  en={turn.text_en}
                  bn={turn.text_bn}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
