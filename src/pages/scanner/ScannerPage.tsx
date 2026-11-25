import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { BilingualText } from '@/components/common/BilingualText';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { EphemeralMediaRecord, ObjectScanResponse } from '@/types/phygital';

export function ScannerPage() {
  const {
    children,
    activeChildId,
    aiMode,
    refreshDashboard,
    setCompanionReaction,
  } = usePhygitalStore();
  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'denied' | 'unavailable'>('idle');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [sceneHint, setSceneHint] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ObjectScanResponse | null>(null);
  const [savedMedia, setSavedMedia] = useState<EphemeralMediaRecord | null>(null);
  const [questClaimed, setQuestClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');
    } catch (err) {
      const name = (err as Error).name;
      setCameraState(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable');
      setError('Camera permission was denied or no camera was detected. You can upload a photo from your device instead.');
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(800, video.videoWidth);
    canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedDataUrl(dataUrl);
    setAnalysis(null);
    setQuestClaimed(false);
    stopCamera();
    setCameraState('idle');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please pick a JPEG, PNG, or WebP photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedDataUrl(String(reader.result));
      setAnalysis(null);
      setQuestClaimed(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function runAnalysis() {
    if (!child || !capturedDataUrl) return;
    setAnalyzing(true);
    setError(null);
    try {
      const mimeMatch = capturedDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
      const mimeType = (mimeMatch?.[1] as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg';
      const res = await phygitalApi.analyzeObject({
        childId: child.id,
        imageBase64: capturedDataUrl,
        mimeType,
        ageGroup: child.age_group,
        language: child.preferred_language,
        sceneHint: sceneHint.trim() || undefined,
        saveEphemeral: true,
      });
      setAnalysis(res.analysis);
      setSavedMedia(res.ephemeralMedia);
      setCompanionReaction('surprised', [
        {
          character: 'leo',
          emotion: 'amazed',
          text_en: `Fascinating! I spotted ${res.analysis.detected_objects.join(', ')}!`,
          text_bn: `অসাধারণ! আমি ${res.analysis.detected_objects.join(', ')} দেখতে পাচ্ছি!`,
        },
      ]);
    } catch (err) {
      setAnalysis(null);
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteTemporaryPhoto() {
    if (!savedMedia) {
      setCapturedDataUrl(null);
      return;
    }
    try {
      await phygitalApi.deleteEphemeralMedia(savedMedia.id);
      setSavedMedia(null);
      setCapturedDataUrl(null);
      setAnalysis(null);
      await refreshDashboard();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function completeGeneratedQuest() {
    if (!child || !analysis) return;
    try {
      const res = await phygitalApi.completeQuest({
        childId: child.id,
        questZone: analysis.zone,
        questCode: `scan_${Date.now()}`,
        questTitle: analysis.quest_title_en,
        questCategory: 'discovery',
        aiSummary: `Scanned objects (${analysis.detected_objects.join(', ')}) and completed discovery quest.`,
      });
      setQuestClaimed(true);
      await refreshDashboard();
      setCompanionReaction('celebration', [
        {
          character: 'maya',
          emotion: 'happy',
          text_en: `That was amazing! You earned +${res.awardedXp} XP!`,
          text_bn: `দারুণ হয়েছে! তুমি +${res.awardedXp} XP অর্জন করেছ!`,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!child) return null;

  if (!child.permissions.camera_enabled) {
    return (
      <div className="storybook-card mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-terracotta" />
        <h1 className="mt-3 text-2xl font-bold text-ink">Camera Scanner Paused</h1>
        <p className="mt-2 text-sm text-earth">
          A parent has disabled camera access in Parental Controls. Ask your parent to turn it on in the Parent Dashboard if you&rsquo;d like to scan objects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-ink">Live Object-to-Quest Scanner</h1>
          <p className="mt-1 text-sm font-semibold text-earth">
            Point at a leaf, spoon, glass of water, book, or messy desk—photos expire in 48 hours!
          </p>
        </div>
        {aiMode === 'development_mock' && (
          <span className="rounded-full bg-sun/45 px-3 py-1 text-xs font-extrabold text-ink">
            Development Mode (Local Deterministic Quest Generator)
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Camera Viewport */}
        <div className="storybook-card space-y-4 p-5 lg:col-span-6">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-earth/15 bg-ink/5">
            {capturedDataUrl ? (
              <img
                src={capturedDataUrl}
                alt="Captured everyday object"
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${cameraState === 'active' ? 'block' : 'hidden'}`}
                />
                {cameraState !== 'active' && (
                  <div className="p-6 text-center">
                    <Camera className="mx-auto h-12 w-12 text-earth/60" />
                    <p className="mt-2 text-sm font-bold text-ink">
                      {cameraState === 'starting'
                        ? 'Starting camera...'
                        : cameraState === 'denied'
                          ? 'Camera permission denied'
                          : 'Ready to scan everyday objects'}
                    </p>
                    <p className="mt-1 text-xs text-earth">
                      Enable camera preview or upload an image file below.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!capturedDataUrl && cameraState !== 'active' && (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="storybook-pill-btn flex flex-1 items-center justify-center gap-2 bg-terracotta px-5 py-2.5 text-sm text-white shadow-tactile"
              >
                <Camera className="h-4 w-4" />
                Open Live Camera
              </button>
            )}

            {cameraState === 'active' && (
              <button
                type="button"
                onClick={captureFrame}
                className="storybook-pill-btn flex flex-1 items-center justify-center gap-2 bg-terracotta px-5 py-2.5 text-sm text-white shadow-tactile"
              >
                <Sparkles className="h-4 w-4" />
                Capture Photo
              </button>
            )}

            {capturedDataUrl && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedDataUrl(null);
                    setAnalysis(null);
                    void startCamera();
                  }}
                  className="storybook-pill-btn flex items-center gap-2 border-2 border-earth/25 bg-white px-4 py-2 text-sm text-ink"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTemporaryPhoto()}
                  className="storybook-pill-btn flex items-center gap-2 border-2 border-terracotta/30 bg-white px-4 py-2 text-sm text-terracotta"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Photo
                </button>
              </>
            )}

            <label className="storybook-pill-btn flex cursor-pointer items-center gap-2 border-2 border-earth/20 bg-white px-4 py-2 text-sm text-ink">
              <Upload className="h-4 w-4" />
              Upload Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="sr-only" />
            </label>
          </div>

          {capturedDataUrl && (
            <div className="space-y-3 border-t border-earth/15 pt-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">
                  Optional object hint (useful in Development Mode, e.g., &ldquo;leaf&rdquo;, &ldquo;messy desk&rdquo;, &ldquo;salt and water&rdquo;)
                </label>
                <input
                  type="text"
                  value={sceneHint}
                  onChange={(e) => setSceneHint(e.target.value)}
                  placeholder="What did you point the camera at?"
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                />
              </div>
              <button
                type="button"
                disabled={analyzing}
                onClick={() => void runAnalysis()}
                className="storybook-pill-btn flex w-full items-center justify-center gap-2 bg-sage px-6 py-3 text-ink shadow-tactile disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {analyzing ? 'Leo & Maya are inspecting...' : 'Generate Real-World Quest'}
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-2xl bg-terracotta/15 px-4 py-3 text-sm font-bold text-terracotta">
              {error}
            </p>
          )}
        </div>

        {/* Generated Quest Result */}
        <div className="storybook-card flex flex-col justify-between p-5 lg:col-span-6">
          {!analysis ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-sun" />
              <h2 className="mt-3 text-xl font-bold text-ink">Ready for Discovery!</h2>
              <p className="mt-2 max-w-sm text-sm text-earth">
                Capture or upload a safe everyday object on the left, and Leo &amp; Maya will invent a real-world mission around it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-sun/45 px-3 py-1 text-xs font-extrabold text-ink">
                  {analysis.mode === 'gemini' ? 'Gemini Vision' : 'Development Mode'}
                </span>
                {savedMedia && (
                  <span className="text-xs font-bold text-earth">
                    48h Vault ID: {savedMedia.id.slice(0, 8)}…
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {analysis.detected_objects.map((obj) => (
                  <span
                    key={obj}
                    className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink ring-1 ring-earth/15"
                  >
                    {obj}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-ink">
                <BilingualText
                  language={child.preferred_language}
                  en={analysis.quest_title_en}
                  bn={analysis.quest_title_bn}
                />
              </h2>

              <p className="rounded-2xl bg-white p-4 text-sm text-ink">
                <BilingualText
                  language={child.preferred_language}
                  en={analysis.quest_instructions_en}
                  bn={analysis.quest_instructions_bn}
                />
              </p>

              <div className="flex items-start gap-2 rounded-2xl bg-terracotta/10 p-3.5 text-xs font-bold text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                <BilingualText
                  language={child.preferred_language}
                  en={analysis.safety_note_en}
                  bn={analysis.safety_note_bn}
                />
              </div>

              <p className="text-sm font-bold text-earth">
                Question from Maya:{' '}
                <BilingualText
                  language={child.preferred_language}
                  en={analysis.follow_up_question_en}
                  bn={analysis.follow_up_question_bn}
                />
              </p>

              {questClaimed ? (
                <div className="rounded-2xl bg-sage/35 px-4 py-3 text-sm font-bold text-ink">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Quest completed &amp; +20 XP saved!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void completeGeneratedQuest()}
                  className="storybook-pill-btn flex w-full items-center justify-center gap-2 bg-terracotta px-6 py-3 text-white shadow-tactile"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  I Did This in Real Life! (+20 XP)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
