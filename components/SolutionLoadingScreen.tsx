import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { PLAYER_LEVELS } from '../mockData';
import { TutorAvatarIcon } from './icons/TutorAvatarIcon';

const PROCESSING_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

interface SolutionLoadingScreenProps {
  isVisible: boolean;
  /** Optional: show compact status HUD (level, XP, brain points) */
  streak?: number;
  xp?: number;
  brainPoints?: number;
}

const SolutionLoadingScreen: React.FC<SolutionLoadingScreenProps> = ({
  isVisible,
  streak = 0,
  xp = 0,
  brainPoints = 0,
}) => {
  const { t } = useLocalization();
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setVisibleSteps(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    PROCESSING_STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleSteps((n) => Math.max(n, i + 1)), 400 + i * 600)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  const currentLevel = useMemo(
    () => PLAYER_LEVELS.slice().reverse().find((l) => xp >= l.minXp) || PLAYER_LEVELS[0],
    [xp]
  );

  if (!isVisible) return null;

  const noiseDataUrl =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.04"/></svg>'
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0B0F1A] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0B0F1A 0%, #12182B 100%)',
      }}
    >
      {/* Blurred layer over potential camera/content behind */}
      <div
        className="absolute inset-0 backdrop-blur-md bg-[#0B0F1A]/80"
        aria-hidden
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: `url("${noiseDataUrl}")` }}
      />

      {/* Center: orb + title + subtitle */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-safe">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Floating neural particles */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[#5B8CFF]/60 animate-neural-particle"
              style={{
                left: `${50 + 40 * Math.cos((i * 60 * Math.PI) / 180)}%`,
                top: `${50 + 40 * Math.sin((i * 60 * Math.PI) / 180)}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <div
              key={`v-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-[#A78BFA]/50 animate-neural-particle"
              style={{
                left: `${50 + 35 * Math.cos((i * 120 * Math.PI) / 180 + 0.5)}%`,
                top: `${50 + 35 * Math.sin((i * 120 * Math.PI) / 180 + 0.5)}%`,
                animationDelay: `${i * 0.6 + 0.2}s`,
              }}
            />
          ))}

          {/* Orb / маскот Algor */}
          <div
            className="relative w-32 h-32 rounded-full animate-orb-breathe flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(167, 139, 250, 0.4), rgba(91, 140, 255, 0.3) 40%, rgba(91, 140, 255, 0.15) 70%, transparent)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <TutorAvatarIcon className="w-[7.5rem] h-[7.5rem] opacity-95" />
          </div>
        </div>

        <h2 className="mt-8 text-xl font-bold text-white tracking-tight">
          {t('processing.title')}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {t('processing.subtitle')}
        </p>

        {/* Dynamic checklist */}
        <div className="mt-10 w-full max-w-xs space-y-2">
          {PROCESSING_STEPS.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl py-2.5 px-4"
              style={{
                opacity: visibleSteps > i ? 1 : 0,
                transform: visibleSteps > i ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: visibleSteps > i ? '0 0 20px rgba(91, 140, 255, 0.08)' : 'none',
              }}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[#5B8CFF]"
                style={{
                  background: visibleSteps > i ? 'rgba(91, 140, 255, 0.2)' : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(91, 140, 255, 0.3)',
                }}
              >
                {visibleSteps > i ? '✓' : i + 1}
              </span>
              <span className="text-sm text-white/80 font-medium">
                {t(`processing.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SolutionLoadingScreen;
