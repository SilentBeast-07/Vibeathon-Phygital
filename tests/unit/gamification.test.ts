import { describe, expect, it } from 'vitest';
import { ADVENTURE_ZONES, BADGE_CATALOG, QUEST_CATALOG } from '@/features/quests/questCatalog';
import { calculateLevelFromXp, formatCountdown, pickText, xpBoundsForLevel } from '@/utils/i18n';

describe('Phygital Gamification & Localization Utilities', () => {
  it('computes progressive explorer levels accurately', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(24)).toBe(1);
    expect(calculateLevelFromXp(25)).toBe(2);
    expect(calculateLevelFromXp(100)).toBe(3);

    const bounds = xpBoundsForLevel(2);
    expect(bounds.currentFloor).toBe(25);
    expect(bounds.nextTarget).toBe(100);
  });

  it('supports English, Bengali, and Bilingual text selection', () => {
    expect(pickText('en', 'Hello', 'হ্যালো')).toEqual({ primary: 'Hello' });
    expect(pickText('bn', 'Hello', 'হ্যালো')).toEqual({ primary: 'হ্যালো', secondary: 'Hello' });
    expect(pickText('bilingual', 'Hello', 'হ্যালো')).toEqual({
      primary: 'Hello',
      secondary: 'হ্যালো',
    });
  });

  it('formats 48-hour privacy shield countdown cleanly', () => {
    expect(formatCountdown(0)).toBe('Expired (00h 00m)');
    expect(formatCountdown(3660)).toBe('1h 01m left');
  });

  it('defines all five non-school-subject adventure zones and core badges', () => {
    expect(ADVENTURE_ZONES).toHaveLength(5);
    expect(ADVENTURE_ZONES.map((z) => z.name_en)).not.toContain('Science');
    expect(ADVENTURE_ZONES.map((z) => z.name_en)).not.toContain('History');
    expect(BADGE_CATALOG.length).toBeGreaterThanOrEqual(7);
    expect(QUEST_CATALOG.every((q) => q.age_hint.junior && q.age_hint.curious && q.age_hint.trailblazer)).toBe(
      true
    );
  });
});
