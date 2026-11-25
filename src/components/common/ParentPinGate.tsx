import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';

export function ParentPinGate({ children }: { children: React.ReactNode }) {
  const { parent, parentUnlocked, setParentUnlocked } = usePhygitalStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!parent?.has_pin || parentUnlocked) {
    return <>{children}</>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await phygitalApi.verifyPin(pin);
      setParentUnlocked(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="storybook-card p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/15 text-terracotta">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-ink">Parent Co-Pilot Gate</h2>
        <p className="mt-2 text-sm text-earth">
          Enter your 4-digit Parent PIN to manage quests, permissions, and the 48-Hour Privacy Shield.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="4-digit PIN"
            aria-label="Parent 4-digit PIN"
            className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-ink"
            required
          />
          {error && (
            <p className="rounded-xl bg-terracotta/15 px-3 py-2 text-sm font-semibold text-terracotta">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || pin.length < 4}
            className="storybook-pill-btn flex w-full items-center justify-center gap-2 bg-terracotta px-6 py-3 text-white shadow-tactile disabled:opacity-50"
          >
            <ShieldCheck className="h-5 w-5" />
            {submitting ? 'Checking...' : 'Unlock Parent Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
