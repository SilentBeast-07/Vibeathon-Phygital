import type { PreferredLanguage } from '@/types/phygital';
import { pickText } from '@/utils/i18n';

interface BilingualTextProps {
  language: PreferredLanguage;
  en: string;
  bn?: string;
  className?: string;
  secondaryClassName?: string;
}

export function BilingualText({
  language,
  en,
  bn,
  className = '',
  secondaryClassName = 'mt-0.5 block text-sm font-medium text-earth/90',
}: BilingualTextProps) {
  const { primary, secondary } = pickText(language, en, bn);
  return (
    <span className={className}>
      <span>{primary}</span>
      {secondary && <span className={secondaryClassName}>{secondary}</span>}
    </span>
  );
}
