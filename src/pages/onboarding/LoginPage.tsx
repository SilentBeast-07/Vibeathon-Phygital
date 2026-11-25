import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Sparkles } from 'lucide-react';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession, hydrateSession } = usePhygitalStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await phygitalApi.loginParent(email, password);
      setSession(res.parent, res.token);
      await hydrateSession();
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-10">
      <div className="storybook-card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun shadow-sm">
            <Sparkles className="h-7 w-7 text-ink" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Welcome Back to Phygital</h1>
          <p className="mt-1 text-sm text-earth">Parent sign in to continue your child&rsquo;s real-world quests</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-ink">Parent Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="parent@example.com"
              className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-ink">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
              className="w-full rounded-2xl border-2 border-earth/20 bg-white px-4 py-3 text-ink"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-terracotta/15 px-3 py-2 text-sm font-bold text-terracotta">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="storybook-pill-btn flex w-full items-center justify-center gap-2 bg-terracotta px-6 py-3 text-white shadow-tactile disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-earth/15 pt-4 text-center text-sm text-earth">
          New family?{' '}
          <Link to="/onboarding" className="font-bold text-terracotta underline">
            Start Storybook Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
