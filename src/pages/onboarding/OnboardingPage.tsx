import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { CompanionStage3D } from '@/components/characters/CompanionStage3D';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { AgeGroup, PreferredLanguage } from '@/types/phygital';

const TOTAL_STEPS = 8;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setSession, hydrateSession } = usePhygitalStore();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('1234');
  const [nickname, setNickname] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('curious');
  const [language, setLanguage] = useState<PreferredLanguage>('bilingual');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [voiceCapsulesEnabled, setVoiceCapsulesEnabled] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function canProceed(): boolean {
    if (step === 2) {
      return email.includes('@') && displayName.trim().length >= 2 && password.length >= 6 && /^\d{4}$/.test(pin);
    }
    if (step === 3) return nickname.trim().length >= 2;
    if (step === 6) return consentAccepted;
    return true;
  }

  async function handleFinish() {
    setBusy(true);
    setError(null);
    try {
      const reg = await phygitalApi.registerParent({
        email,
        password,
        displayName,
        pin,
      });
      setSession(reg.parent, reg.token);

      const { child } = await phygitalApi.createChild({
        nickname,
        ageGroup,
        preferredLanguage: language,
        permissions: {
          camera_enabled: cameraEnabled,
          microphone_enabled: micEnabled,
          ai_companion_enabled: aiEnabled,
          voice_capsules_enabled: voiceCapsulesEnabled,
        },
      });
      localStorage.setItem('phygital_active_child_id', child.id);
      await hydrateSession();
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-terracotta">
              Step {step} of {TOTAL_STEPS}
            </span>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">PHYGITAL Adventure Book</h1>
          </div>
          <Link to="/login" className="text-sm font-bold text-earth underline hover:text-terracotta">
            Already registered? Sign in
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-cardwarm">
          <div
            className="h-full rounded-full bg-terracotta transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="storybook-card p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5 text-center">
              <CompanionStage3D animation="happy" />
              <h2 className="text-2xl font-bold text-ink">Meet Leo &amp; Maya!</h2>
              <p className="text-base text-earth">
                &ldquo;Your next adventure starts in the real world!&rdquo; Explore science in your
                kitchen, collect family stories, and charge our Sun-Battery by stepping away from screens.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-ink">Parent &amp; Guardian Account</h2>
              <p className="text-sm text-earth">
                Parents hold the keys to permissions, custom quests, and the 48-Hour Privacy Shield.
              </p>
              <div>
                <label className="mb-1 block text-sm font-bold text-ink">Parent Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Ananya"
                  className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-ink"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-ink">Parent Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-ink"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-ink">Password (6+ chars)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-ink">Parent Lock PIN (4 digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-center font-bold tracking-widest text-ink"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-ink">Choose an Explorer Nickname</h2>
              <p className="text-sm text-earth">
                Privacy first! Never use a full legal name or school name—pick a fun explorer nickname instead.
              </p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                placeholder="e.g., Starfinder, Munna, Pip"
                className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3.5 text-lg font-bold text-ink"
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-ink">Select Age Group</h2>
              <p className="text-sm text-earth">
                Quests, vocabulary, and Leo &amp; Maya&rsquo;s questions adapt automatically.
              </p>
              <div className="grid gap-3">
                {[
                  {
                    id: 'junior' as AgeGroup,
                    title: 'Junior Explorers (Ages 6–8)',
                    desc: 'Playful sensory discoveries, gentle prompts, and cozy starter habits.',
                  },
                  {
                    id: 'curious' as AgeGroup,
                    title: 'Curious Discoverers (Ages 9–11)',
                    desc: 'Hands-on observations, room mapping, and bilingual storytelling.',
                  },
                  {
                    id: 'trailblazer' as AgeGroup,
                    title: 'Young Trailblazers (Ages 12–14)',
                    desc: 'Hypothesis testing, heritage interviews, and independent life skills.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAgeGroup(opt.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      ageGroup === opt.id
                        ? 'border-terracotta bg-white shadow-sm'
                        : 'border-earth/15 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <p className="font-bold text-ink">{opt.title}</p>
                    <p className="mt-1 text-sm text-earth">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-ink">Choose Language Preference</h2>
              <div className="grid gap-3">
                {[
                  { id: 'bilingual' as PreferredLanguage, title: 'Bilingual (English + বাংলা)', desc: 'Both languages side-by-side with natural Banglish warmth.' },
                  { id: 'en' as PreferredLanguage, title: 'English', desc: 'English quests with optional Bengali cultural highlights.' },
                  { id: 'bn' as PreferredLanguage, title: 'Bengali (বাংলা)', desc: 'বাংলায় গল্প ও অভিযানের নির্দেশনা।' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLanguage(opt.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      language === opt.id
                        ? 'border-terracotta bg-white shadow-sm'
                        : 'border-earth/15 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <p className="font-bold text-ink">{opt.title}</p>
                    <p className="mt-1 text-sm text-earth">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-terracotta">
                <ShieldCheck className="h-6 w-6" />
                <h2 className="text-2xl font-bold text-ink">Parental Permissions &amp; 48h Privacy Shield</h2>
              </div>
              <p className="text-sm text-earth">
                Any temporary photo or voice clip is strictly locked behind Row-Level Security and
                automatically deleted within 48 hours.
              </p>

              <div className="space-y-2.5 rounded-2xl bg-white p-4">
                {[
                  { label: 'Camera Quest Scanner & Habit Mirror', val: cameraEnabled, set: setCameraEnabled },
                  { label: 'Microphone (Reverse Tutoring & Sound Quests)', val: micEnabled, set: setMicEnabled },
                  { label: 'AI Companion Dialogue (Leo & Maya)', val: aiEnabled, set: setAiEnabled },
                  { label: 'Intergenerational Voice Capsules', val: voiceCapsulesEnabled, set: setVoiceCapsulesEnabled },
                ].map((item) => (
                  <label key={item.label} className="flex cursor-pointer items-center justify-between gap-3 py-1">
                    <span className="text-sm font-bold text-ink">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="h-5 w-5 accent-terracotta"
                    />
                  </label>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-sage bg-sage/20 p-4">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-terracotta"
                />
                <span className="text-sm font-semibold text-ink">
                  As parent/guardian, I consent to creating this nickname-only explorer profile and
                  understand temporary media expires and deletes within 48 hours.
                </span>
              </label>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-sun/50">
                <Sun className="h-11 w-11 text-terracotta" />
              </div>
              <h2 className="text-2xl font-bold text-ink">The Offline Sun-Battery</h2>
              <p className="text-base text-earth">
                Unlike regular apps that keep kids glued to screens, Phygital&rsquo;s Sun-Battery charges
                when your child puts down the device to read, draw, water a plant, or talk with grandparents!
              </p>
              <div className="rounded-2xl bg-white p-4 text-left text-sm text-earth">
                <CheckCircle2 className="mb-1 inline h-4 w-4 text-sage" /> 15, 20, and 30-minute real-world missions measured via verified timestamps.
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sage/35 text-ink">
                <Sparkles className="h-8 w-8 text-terracotta" />
              </div>
              <h2 className="text-2xl font-bold text-ink">Ready for Adventure, {nickname || 'Explorer'}!</h2>
              <p className="text-base text-earth">
                Leo and Maya have prepared your five Adventure Zones and starter missions.
              </p>
              {error && (
                <p className="rounded-2xl bg-terracotta/15 px-4 py-3 text-sm font-bold text-terracotta">
                  {error}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="storybook-pill-btn flex items-center gap-2 border-2 border-earth/25 bg-white px-5 py-2.5 text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
                className="storybook-pill-btn flex items-center gap-2 bg-terracotta px-6 py-2.5 text-white shadow-tactile disabled:opacity-45"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleFinish()}
                className="storybook-pill-btn flex items-center gap-2 bg-terracotta px-7 py-3 text-white shadow-tactile disabled:opacity-50"
              >
                {busy ? 'Creating Adventure...' : 'Enter Adventure Home'}
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
