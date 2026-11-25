import { Sun } from 'lucide-react';

export function SunBatteryGauge({ level, compact = false }: { level: number; compact?: boolean }) {
  const clamped = Math.max(0, Math.min(100, level));
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun/45 text-ink shadow-sm">
        <Sun className="h-6 w-6 text-terracotta" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs font-bold text-earth">
          <span>{compact ? 'Sun-Battery' : 'Offline Sun-Battery'}</span>
          <span className="text-ink">{clamped}%</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/80 p-0.5 ring-1 ring-earth/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sun to-terracotta transition-all duration-500"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
