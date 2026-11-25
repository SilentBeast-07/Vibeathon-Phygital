import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AdventureZonesPage } from '@/pages/adventure-zones/AdventureZonesPage';
import { HabitMirrorPage } from '@/pages/habit-mirror/HabitMirrorPage';
import { HomePage } from '@/pages/home/HomePage';
import { OfflineMissionsPage } from '@/pages/offline-missions/OfflineMissionsPage';
import { LoginPage } from '@/pages/onboarding/LoginPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { ParentDashboardPage } from '@/pages/parent-dashboard/ParentDashboardPage';
import { ReverseTutoringPage } from '@/pages/reverse-tutoring/ReverseTutoringPage';
import { RewardsPage } from '@/pages/rewards/RewardsPage';
import { ScannerPage } from '@/pages/scanner/ScannerPage';
import { SoundScavengerPage } from '@/pages/sound-scavenger/SoundScavengerPage';
import { VoiceCapsulesPage } from '@/pages/voice-capsules/VoiceCapsulesPage';
import { usePhygitalStore } from '@/store/usePhygitalStore';

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { token, parent, isLoading } = usePhygitalStore();

  if (isLoading && !parent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment text-ink">
        <div className="storybook-card px-8 py-6 text-center">
          <p className="text-lg font-bold">Opening your Adventure Book...</p>
        </div>
      </div>
    );
  }

  if (!token || !parent) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export function AppRouter() {
  const hydrateSession = usePhygitalStore((s) => s.hydrateSession);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedShell>
              <HomePage />
            </ProtectedShell>
          }
        />
        <Route
          path="/zones"
          element={
            <ProtectedShell>
              <AdventureZonesPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedShell>
              <ScannerPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/rewards"
          element={
            <ProtectedShell>
              <RewardsPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/parent"
          element={
            <ProtectedShell>
              <ParentDashboardPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/reverse-tutoring"
          element={
            <ProtectedShell>
              <ReverseTutoringPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/voice-capsules"
          element={
            <ProtectedShell>
              <VoiceCapsulesPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/sound-scavenger"
          element={
            <ProtectedShell>
              <SoundScavengerPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/offline-missions"
          element={
            <ProtectedShell>
              <OfflineMissionsPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/habit-mirror"
          element={
            <ProtectedShell>
              <HabitMirrorPage />
            </ProtectedShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
