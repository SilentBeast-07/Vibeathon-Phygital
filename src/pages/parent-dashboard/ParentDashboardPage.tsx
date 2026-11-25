import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  ClipboardPlus,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import { ParentPinGate } from '@/components/common/ParentPinGate';
import { ADVENTURE_ZONES } from '@/features/quests/questCatalog';
import { phygitalApi } from '@/services/api';
import { usePhygitalStore } from '@/store/usePhygitalStore';
import type { AgeGroup, PreferredLanguage } from '@/types/phygital';
import { formatCountdown } from '@/utils/i18n';

type ParentTab = 'overview' | 'assign' | 'progress' | 'privacy' | 'controls';

export function ParentDashboardPage() {
  return (
    <ParentPinGate>
      <ParentDashboardContent />
    </ParentPinGate>
  );
}

function ParentDashboardContent() {
  const {
    children,
    activeChildId,
    progress,
    parentQuests,
    badges,
    ephemeralMedia,
    purgeAudits,
    selectChild,
    refreshDashboard,
    hydrateSession,
    setParentUnlocked,
  } = usePhygitalStore();

  const child = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const [tab, setTab] = useState<ParentTab>('overview');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Assign Quest Form
  const [questTitle, setQuestTitle] = useState('');
  const [questDesc, setQuestDesc] = useState('');
  const [rewardXp, setRewardXp] = useState(15);
  const [dueDate, setDueDate] = useState('');
  const [ageSuitability, setAgeSuitability] = useState<'all' | AgeGroup>('all');

  // New Child Profile Form
  const [newNickname, setNewNickname] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState<AgeGroup>('junior');
  const [newLang, setNewLang] = useState<PreferredLanguage>('bilingual');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const unlockedBadges = useMemo(() => badges.filter((b) => Boolean(b.unlocked_at)), [badges]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of progress) {
      counts[p.quest_zone] = (counts[p.quest_zone] || 0) + 1;
    }
    return counts;
  }, [progress]);

  if (!child) {
    return (
      <div className="storybook-card p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">No Child Profiles</h1>
        <p className="mt-2 text-sm text-earth">Create a child explorer profile below to start.</p>
      </div>
    );
  }

  async function handleAssignQuest(e: React.FormEvent) {
    e.preventDefault();
    if (!child) return;
    setError(null);
    setStatusMsg(null);
    try {
      await phygitalApi.addParentQuest({
        childId: child.id,
        title: questTitle,
        description: questDesc,
        rewardXp,
        ageSuitability,
        dueAt: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setQuestTitle('');
      setQuestDesc('');
      setDueDate('');
      await refreshDashboard();
      setStatusMsg('Real-life quest assigned and now visible to your child!');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function togglePermission(
    key: keyof typeof child.permissions,
    value: boolean
  ) {
    if (!child) return;
    setError(null);
    try {
      await phygitalApi.updateChild(child.id, {
        permissions: { [key]: value },
      });
      await refreshDashboard();
      setStatusMsg('Parental permissions updated.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateChildSettings(updates: {
    age_group?: AgeGroup;
    preferred_language?: PreferredLanguage;
  }) {
    if (!child) return;
    setError(null);
    try {
      await phygitalApi.updateChild(child.id, updates);
      await refreshDashboard();
      setStatusMsg('Explorer profile updated.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRunPurge() {
    setError(null);
    try {
      const res = await phygitalApi.triggerPurgeWorker();
      await refreshDashboard();
      setStatusMsg(
        `Purge worker ran (${res.audit.status}): ${res.audit.expired_found} expired found, ${res.audit.metadata_deleted} deleted.`
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteMediaItem(id: string) {
    setError(null);
    try {
      await phygitalApi.deleteEphemeralMedia(id);
      await refreshDashboard();
      setStatusMsg('Temporary media item deleted immediately.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { child: created } = await phygitalApi.createChild({
        nickname: newNickname,
        ageGroup: newAgeGroup,
        preferredLanguage: newLang,
      });
      setNewNickname('');
      await hydrateSession();
      await selectChild(created.id);
      setStatusMsg(`Explorer profile "${created.nickname}" created!`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteChildData() {
    if (!child) return;
    setError(null);
    try {
      await phygitalApi.deleteChild(child.id);
      setConfirmDelete(false);
      await hydrateSession();
      setStatusMsg('Child profile and all associated progress & temporary media were permanently deleted.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Parent Co-Pilot Dashboard</h1>
          <p className="mt-1 text-sm font-semibold text-earth">
            Supervising explorer: <strong className="text-ink">{child.nickname}</strong> (Level{' '}
            {child.level} · {child.total_xp} XP)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setParentUnlocked(false)}
          className="inline-flex items-center gap-1.5 rounded-full border border-earth/25 bg-white px-4 py-2 text-xs font-extrabold text-ink"
        >
          <Lock className="h-3.5 w-3.5 text-terracotta" />
          Lock Parent View
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {[
          { id: 'overview' as ParentTab, label: 'Overview', icon: Activity },
          { id: 'assign' as ParentTab, label: 'Assign Real-Life Quest', icon: ClipboardPlus },
          { id: 'progress' as ParentTab, label: 'Progress & Learning', icon: Award },
          { id: 'privacy' as ParentTab, label: '48h Privacy Shield', icon: ShieldCheck },
          { id: 'controls' as ParentTab, label: 'Parental Controls', icon: Sliders },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${
                active ? 'bg-terracotta text-white shadow-sm' : 'bg-cardwarm text-ink hover:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-sage/30 px-4 py-3 text-sm font-bold text-ink">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {statusMsg}
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-terracotta/15 px-4 py-3 text-sm font-bold text-terracotta">
          {error}
        </div>
      )}

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="storybook-card p-5">
            <p className="text-xs font-extrabold uppercase text-earth">Current Level &amp; XP</p>
            <p className="mt-1 text-2xl font-bold text-ink">Level {child.level}</p>
            <p className="text-sm font-bold text-terracotta">{child.total_xp} Total XP</p>
          </div>
          <div className="storybook-card p-5">
            <p className="text-xs font-extrabold uppercase text-earth">Completed Quests</p>
            <p className="mt-1 text-2xl font-bold text-ink">{progress.length}</p>
            <p className="text-sm text-earth">Real-world &amp; AI quests</p>
          </div>
          <div className="storybook-card p-5">
            <p className="text-xs font-extrabold uppercase text-earth">Offline Sun-Battery</p>
            <p className="mt-1 text-2xl font-bold text-ink">{child.sun_battery_level}%</p>
            <p className="text-sm text-earth">Screen-free energy</p>
          </div>
          <div className="storybook-card p-5">
            <p className="text-xs font-extrabold uppercase text-earth">Unlocked Badges</p>
            <p className="mt-1 text-2xl font-bold text-ink">{unlockedBadges.length}</p>
            <p className="text-sm text-earth">Out of {badges.length} badges</p>
          </div>
        </div>
      )}

      {/* ASSIGN REAL-LIFE QUEST */}
      {tab === 'assign' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={handleAssignQuest} className="storybook-card space-y-4 p-5 lg:col-span-6">
            <h2 className="text-xl font-bold text-ink">Assign a Real-Life Quest</h2>
            <div>
              <label className="mb-1 block text-xs font-bold text-earth">Quest Title</label>
              <input
                type="text"
                required
                value={questTitle}
                onChange={(e) => setQuestTitle(e.target.value)}
                placeholder="e.g., Organize your bookshelf before dinner"
                className="w-full rounded-xl border border-earth/20 bg-white px-3.5 py-2.5 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-earth">Description</label>
              <textarea
                rows={3}
                value={questDesc}
                onChange={(e) => setQuestDesc(e.target.value)}
                placeholder="Helpful notes for your child..."
                className="w-full rounded-xl border border-earth/20 bg-white px-3.5 py-2.5 text-sm text-ink"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">Reward XP (5–30)</label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={rewardXp}
                  onChange={(e) => setRewardXp(Number(e.target.value))}
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">Age Suitability</label>
                <select
                  value={ageSuitability}
                  onChange={(e) => setAgeSuitability(e.target.value as 'all' | AgeGroup)}
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="all">All Ages</option>
                  <option value="junior">Junior (6–8)</option>
                  <option value="curious">Curious (9–11)</option>
                  <option value="trailblazer">Trailblazer (12–14)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">Optional Deadline</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                />
              </div>
            </div>
            <button
              type="submit"
              className="storybook-pill-btn inline-flex items-center gap-2 bg-terracotta px-6 py-2.5 text-sm text-white shadow-tactile"
            >
              <Plus className="h-4 w-4" />
              Assign Quest to {child.nickname}
            </button>
          </form>

          <div className="storybook-card p-5 lg:col-span-6">
            <h2 className="mb-3 text-xl font-bold text-ink">Assigned Quests</h2>
            {parentQuests.length === 0 ? (
              <p className="text-sm text-earth">No parent-assigned quests yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {parentQuests.map((pq) => (
                  <li key={pq.id} className="rounded-2xl bg-white p-3.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{pq.title}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          pq.status === 'completed' ? 'bg-sage/35 text-ink' : 'bg-sun/45 text-ink'
                        }`}
                      >
                        {pq.status} · +{pq.reward_xp} XP
                      </span>
                    </div>
                    {pq.description && <p className="mt-1 text-xs text-earth">{pq.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* PROGRESS & LEARNING */}
      {tab === 'progress' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="storybook-card p-5">
            <h2 className="mb-3 text-xl font-bold text-ink">Adventure Zones Explored</h2>
            <div className="space-y-3">
              {ADVENTURE_ZONES.map((z) => {
                const count = zoneCounts[z.id] || 0;
                return (
                  <div key={z.id} className="rounded-2xl bg-white p-3">
                    <div className="flex justify-between text-sm font-bold text-ink">
                      <span>{z.name_en}</span>
                      <span>{count} completed</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-cardwarm">
                      <div
                        className="h-full rounded-full bg-terracotta"
                        style={{ width: `${Math.min(100, count * 25)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="storybook-card p-5">
            <h2 className="mb-3 text-xl font-bold text-ink">Anonymized Learning Summaries</h2>
            <p className="mb-3 text-xs text-earth">
              Only short learning summaries are kept permanently—raw camera or voice clips are never exposed here.
            </p>
            {progress.length === 0 ? (
              <p className="text-sm text-earth">No completed quests logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {progress.slice(0, 8).map((p) => (
                  <li key={p.id} className="rounded-2xl bg-white p-3 text-xs">
                    <p className="font-bold text-ink">{p.quest_title}</p>
                    <p className="mt-0.5 text-earth">{p.ai_evaluation_summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 48-HOUR PRIVACY SHIELD */}
      {tab === 'privacy' && (
        <div className="space-y-5">
          <div className="storybook-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink">48-Hour Privacy Shield</h2>
                <p className="text-xs text-earth">
                  Temporary media is isolated in a private vault, expires automatically at 48h00m, and
                  is physically deleted every 5 minutes by <code>purgeExpiredMedia</code>. Raw files are
                  never previewed here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRunPurge()}
                className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-xs font-extrabold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Run Purge Worker Now
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-earth">Active Temporary Items</p>
                <p className="text-2xl font-bold text-ink">{ephemeralMedia.length}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-earth">Cutoff Policy</p>
                <p className="text-2xl font-bold text-ink">Strict 48 Hours</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-earth">Purge Schedule</p>
                <p className="text-2xl font-bold text-ink">Every 5 Min</p>
              </div>
            </div>

            {ephemeralMedia.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-earth">
                Zero temporary photos or voice recordings currently stored in the 48-hour vault!
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {ephemeralMedia.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-bold uppercase text-ink">
                        {m.media_type} ({m.mime_type}) · {Math.max(1, Math.round(m.size_bytes / 1024))} KB
                      </p>
                      <p className="text-earth">
                        Uploaded: {new Date(m.created_at).toLocaleString()} · Scheduled expiry:{' '}
                        {new Date(m.expires_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-sun/45 px-3 py-1 font-extrabold text-ink">
                        {formatCountdown(m.remaining_seconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMediaItem(m.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-terracotta/15 px-3 py-1 font-bold text-terracotta"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {purgeAudits.length > 0 && (
            <div className="storybook-card p-5">
              <h3 className="mb-2 text-base font-bold text-ink">
                Aggregate Deletion Audit Log (Zero Child PII)
              </h3>
              <ul className="space-y-1.5 text-xs text-earth">
                {purgeAudits.slice(0, 5).map((a) => (
                  <li key={a.id} className="rounded-xl bg-white px-3 py-2">
                    {new Date(a.ran_at).toLocaleString()} · status: <strong>{a.status}</strong> ·
                    found: {a.expired_found}, deleted: {a.metadata_deleted}, failures: {a.failure_count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* PARENTAL CONTROLS */}
      {tab === 'controls' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="storybook-card space-y-4 p-5">
            <h2 className="text-xl font-bold text-ink">Profile &amp; Device Permissions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">Age Group</label>
                <select
                  value={child.age_group}
                  onChange={(e) => void updateChildSettings({ age_group: e.target.value as AgeGroup })}
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="junior">Junior Explorers (6–8)</option>
                  <option value="curious">Curious Discoverers (9–11)</option>
                  <option value="trailblazer">Young Trailblazers (12–14)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-earth">Language Preference</label>
                <select
                  value={child.preferred_language}
                  onChange={(e) =>
                    void updateChildSettings({
                      preferred_language: e.target.value as PreferredLanguage,
                    })
                  }
                  className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="bilingual">Bilingual (English + বাংলা)</option>
                  <option value="en">English</option>
                  <option value="bn">Bengali (বাংলা)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl bg-white p-4">
              {[
                { key: 'camera_enabled' as const, label: 'Enable Camera Quest Scanner & Habit Mirror' },
                { key: 'microphone_enabled' as const, label: 'Enable Microphone Features' },
                { key: 'ai_companion_enabled' as const, label: 'Enable AI Companion Dialogue' },
                { key: 'voice_capsules_enabled' as const, label: 'Enable Intergenerational Voice Capsules' },
                { key: 'low_power_2d_mode' as const, label: 'Use 2D Eco Mode (Low-Power Devices)' },
              ].map((perm) => (
                <label key={perm.key} className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm">
                  <span className="font-bold text-ink">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={child.permissions[perm.key]}
                    onChange={(e) => void togglePermission(perm.key, e.target.checked)}
                    className="h-5 w-5 accent-terracotta"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <form onSubmit={handleAddChild} className="storybook-card space-y-3 p-5">
              <h2 className="text-xl font-bold text-ink">Add Another Child Profile</h2>
              <input
                type="text"
                required
                minLength={2}
                maxLength={24}
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Explorer nickname (no real full name needed)"
                className="w-full rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newAgeGroup}
                  onChange={(e) => setNewAgeGroup(e.target.value as AgeGroup)}
                  className="rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="junior">Junior (6–8)</option>
                  <option value="curious">Curious (9–11)</option>
                  <option value="trailblazer">Trailblazer (12–14)</option>
                </select>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value as PreferredLanguage)}
                  className="rounded-xl border border-earth/20 bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="bilingual">Bilingual</option>
                  <option value="en">English</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              <button
                type="submit"
                className="storybook-pill-btn bg-sage px-5 py-2 text-xs text-ink"
              >
                Create Explorer Profile
              </button>
            </form>

            <div className="storybook-card border-2 border-terracotta/40 p-5">
              <h2 className="text-lg font-bold text-terracotta">Delete Child Profile &amp; Data</h2>
              <p className="mt-1 text-xs text-earth">
                Permanently deletes {child.nickname}&rsquo;s profile, XP, badges, quests, memory cards,
                and any temporary media files.
              </p>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 rounded-full border border-terracotta px-4 py-2 text-xs font-extrabold text-terracotta"
                >
                  Delete {child.nickname}&rsquo;s Data...
                </button>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDeleteChildData()}
                    className="rounded-full bg-terracotta px-4 py-2 text-xs font-extrabold text-white"
                  >
                    Yes, Permanently Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-ink"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
