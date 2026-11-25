import { motion } from 'framer-motion';
import type { CompanionAnimation } from '@/types/phygital';

interface Companion2DProps {
  animation: CompanionAnimation;
  onTapCharacter?: (character: 'leo' | 'maya') => void;
}

export function Companion2DFallback({ animation, onTapCharacter }: Companion2DProps) {
  const isCelebrating = animation === 'celebration' || animation === 'happy';
  const isThinking = animation === 'thinking';
  const isSurprised = animation === 'surprised';
  const isTalking = animation === 'talking';

  return (
    <div
      className="relative flex h-full w-full items-end justify-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-b from-[#FAF8F5] via-[#F2ECE4] to-[#E8C878]/35 px-4 pb-4 pt-6"
      aria-label="Leo and Maya 2D illustrated companions"
    >
      {/* Decorative sunlit sky hill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-t-[50%] bg-sage/35" />

      {/* LEO */}
      <motion.button
        type="button"
        onClick={() => onTapCharacter?.('leo')}
        animate={
          isCelebrating
            ? { y: [0, -14, 0], rotate: [0, -3, 3, 0] }
            : isTalking
              ? { y: [0, -4, 0] }
              : isThinking
                ? { rotate: [-2, 2, -2] }
                : { y: [0, -3, 0] }
        }
        transition={{ repeat: Infinity, duration: isCelebrating ? 0.9 : 2.6 }}
        className="group relative z-10 flex flex-col items-center focus:outline-none"
        aria-label="Tap Leo the Inventor"
      >
        <svg viewBox="0 0 130 165" className="h-44 w-36 drop-shadow-md">
          {/* Explorer Vest Body */}
          <rect x="34" y="88" width="62" height="58" rx="18" fill="#C77B5A" stroke="#4A3525" strokeWidth="3" />
          <rect x="46" y="92" width="38" height="48" rx="10" fill="#F2ECE4" />
          {/* Notebook in pocket */}
          <rect x="42" y="112" width="18" height="22" rx="3" fill="#E8C878" stroke="#4A3525" strokeWidth="2" />
          {/* Head */}
          <circle cx="65" cy="54" r="32" fill="#F6D5B0" stroke="#4A3525" strokeWidth="3" />
          {/* Hair */}
          <path d="M35 46 C38 20, 92 18, 95 46 C84 35, 48 35, 35 46 Z" fill="#4A3525" />
          {/* Glasses */}
          <circle cx="53" cy="54" r="10" fill="#FFFFFF" fillOpacity="0.55" stroke="#4A3525" strokeWidth="3" />
          <circle cx="77" cy="54" r="10" fill="#FFFFFF" fillOpacity="0.55" stroke="#4A3525" strokeWidth="3" />
          <line x1="63" y1="54" x2="67" y2="54" stroke="#4A3525" strokeWidth="3" />
          {/* Eyes */}
          <circle cx="53" cy="54" r={isSurprised ? 4 : 3} fill="#4A3525" />
          <circle cx="77" cy="54" r={isSurprised ? 4 : 3} fill="#4A3525" />
          {/* Mouth */}
          {isSurprised ? (
            <circle cx="65" cy="70" r="5" fill="#7A583E" />
          ) : isCelebrating ? (
            <path d="M54 67 Q65 79 76 67" fill="none" stroke="#4A3525" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path d="M57 69 Q65 74 73 69" fill="none" stroke="#4A3525" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Glowing Magnifying Glass */}
          <g transform="translate(88, 72)">
            <line x1="8" y1="18" x2="18" y2="38" stroke="#7A583E" strokeWidth="5" strokeLinecap="round" />
            <circle cx="6" cy="10" r="13" fill="#E8C878" fillOpacity="0.7" stroke="#4A3525" strokeWidth="3" />
          </g>
        </svg>
        <span className="mt-1 rounded-full bg-white/90 px-3 py-0.5 text-xs font-bold text-ink shadow-sm">
          Leo · Inventor
        </span>
      </motion.button>

      {/* MAYA */}
      <motion.button
        type="button"
        onClick={() => onTapCharacter?.('maya')}
        animate={
          isCelebrating
            ? { y: [0, -16, 0], rotate: [0, 4, -4, 0] }
            : isTalking
              ? { y: [0, -5, 0] }
              : { y: [0, -4, 0] }
        }
        transition={{ repeat: Infinity, duration: isCelebrating ? 0.85 : 2.9, delay: 0.2 }}
        className="group relative z-10 flex flex-col items-center focus:outline-none"
        aria-label="Tap Maya the Explorer"
      >
        <svg viewBox="0 0 130 165" className="h-44 w-36 drop-shadow-md">
          {/* Curly Hair Puffs */}
          <circle cx="34" cy="48" r="16" fill="#4A3525" />
          <circle cx="96" cy="48" r="16" fill="#4A3525" />
          <circle cx="48" cy="28" r="15" fill="#4A3525" />
          <circle cx="82" cy="28" r="15" fill="#4A3525" />
          {/* Explorer Tunic */}
          <rect x="34" y="88" width="62" height="58" rx="20" fill="#A5B49A" stroke="#4A3525" strokeWidth="3" />
          {/* Adventure Satchel Strap */}
          <line x1="40" y1="90" x2="90" y2="142" stroke="#7A583E" strokeWidth="6" />
          <rect x="76" y="114" width="22" height="20" rx="5" fill="#C77B5A" stroke="#4A3525" strokeWidth="2.5" />
          {/* Leaf Pin */}
          <path d="M46 105 Q55 96 58 108 Q48 112 46 105 Z" fill="#E8C878" stroke="#4A3525" strokeWidth="2" />
          {/* Head */}
          <circle cx="65" cy="54" r="31" fill="#E9B88E" stroke="#4A3525" strokeWidth="3" />
          {/* Hair Bangs */}
          <path d="M36 44 Q65 25 94 44 Q78 36 65 40 Q52 36 36 44 Z" fill="#4A3525" />
          {/* Eyes */}
          <circle cx="53" cy="55" r={isSurprised ? 4.5 : 3.5} fill="#4A3525" />
          <circle cx="77" cy="55" r={isSurprised ? 4.5 : 3.5} fill="#4A3525" />
          {/* Rosy cheeks */}
          <circle cx="44" cy="63" r="4" fill="#C77B5A" fillOpacity="0.45" />
          <circle cx="86" cy="63" r="4" fill="#C77B5A" fillOpacity="0.45" />
          {/* Smile */}
          <path
            d={isCelebrating ? 'M52 66 Q65 80 78 66' : 'M55 68 Q65 75 75 68'}
            fill="none"
            stroke="#4A3525"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span className="mt-1 rounded-full bg-white/90 px-3 py-0.5 text-xs font-bold text-ink shadow-sm">
          Maya · Explorer
        </span>
      </motion.button>
    </div>
  );
}
