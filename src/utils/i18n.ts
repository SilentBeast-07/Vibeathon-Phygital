import { PreferredLanguage } from '@/types/phygital';

export function pickText(
  lang: PreferredLanguage,
  en: string,
  bn?: string
): { primary: string; secondary?: string } {
  if (lang === 'bn' && bn) {
    return { primary: bn, secondary: en };
  }
  if (lang === 'bilingual' && bn) {
    return { primary: en, secondary: bn };
  }
  return { primary: en };
}

export function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return 'Expired (00h 00m)';
  const hours = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  return `${hours}h ${String(mins).padStart(2, '0')}m left`;
}

export function calculateLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1);
}

export function xpBoundsForLevel(level: number): { currentFloor: number; nextTarget: number } {
  const safeLevel = Math.max(1, level);
  const currentFloor = Math.pow(safeLevel - 1, 2) * 25;
  const nextTarget = Math.pow(safeLevel, 2) * 25;
  return { currentFloor, nextTarget };
}
