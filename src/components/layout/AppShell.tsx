import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Award,
  Camera,
  Compass,
  Home,
  LogOut,
  Shield,
  Sparkles,
  Sun,
} from 'lucide-react';
import { usePhygitalStore } from '@/store/usePhygitalStore';

const PRIMARY_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/zones', label: 'Adventure Zones', icon: Compass },
  { to: '/scanner', label: 'Quest Scanner', icon: Camera },
  { to: '/rewards', label: 'My Rewards', icon: Award },
  { to: '/parent', label: 'Parent Dashboard', icon: Shield },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { children: profiles, activeChildId, selectChild, aiMode, logout } = usePhygitalStore();
  const activeChild = profiles.find((c) => c.id === activeChildId) ?? profiles[0] ?? null;

  return (
    <div className="min-h-screen bg-parchment pb-24 text-ink md:pb-8">
      {/* Top Storybook Header */}
      <header className="sticky top-0 z-30 border-b border-earth/15 bg-parchment/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun shadow-sm">
              <Sparkles className="h-5 w-5 text-ink" />
            </span>
            <div>
              <span className="block font-display text-lg font-bold leading-none text-ink">
                PHYGITAL
              </span>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-earth">
                Real-World Adventure
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Primary Navigation">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? 'bg-terracotta text-white shadow-sm'
                        : 'text-earth hover:bg-cardwarm hover:text-ink'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Profile & Mode Pill */}
          <div className="flex items-center gap-2">
            {aiMode === 'development_mock' && (
              <span
                title="Running in deterministic local Development Mode (no live Gemini API key set)"
                className="hidden rounded-full bg-sun/40 px-3 py-1 text-xs font-bold text-ink sm:inline-block"
              >
                Dev Mode
              </span>
            )}
            {activeChild && (
              <button
                type="button"
                onClick={() => navigate('/offline-missions')}
                className="flex items-center gap-1.5 rounded-full bg-cardwarm px-3 py-1.5 text-xs font-extrabold text-ink ring-1 ring-earth/15"
                title="Open Offline Sun-Battery"
              >
                <Sun className="h-4 w-4 text-terracotta" />
                <span>{activeChild.sun_battery_level}%</span>
              </button>
            )}
            {profiles.length > 1 && (
              <select
                aria-label="Switch active child explorer"
                value={activeChild?.id ?? ''}
                onChange={(e) => void selectChild(e.target.value)}
                className="rounded-full border border-earth/20 bg-white px-3 py-1.5 text-xs font-bold text-ink"
              >
                {profiles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nickname} (Lv.{c.level})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cardwarm text-earth hover:bg-terracotta/15 hover:text-terracotta"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {/* Mobile / Tablet Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-earth/15 bg-parchment/95 px-2 py-2 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-around gap-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition ${
                    isActive ? 'bg-terracotta/15 text-terracotta' : 'text-earth'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label.split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
