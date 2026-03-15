import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import TargetIcon from '../../components/icons/TargetIcon';
import CrystalIcon from '../../components/icons/CrystalIcon';

interface PracticeSummaryScreenProps {
  stats: {
    correct: number;
    total: number;
    xpEarned: number;
    bpEarned?: number;
  };
  streak?: number;
  onDone: () => void;
  onRetry: () => void;
  onAskAlgor?: () => void;
  /** Вызывается, когда мозги «прилетели» в HUD (завершилась анимация полёта). Используется для запуска анимации роста шкалы в HUD. */
  onCognitiveFlyComplete?: () => void;
  /** Вызывается, когда первый BP-кристалл долетел до HUD (для запуска анимации роста числа ВР в HUD). */
  onBpFlyComplete?: () => void;
  sessionStartStreak?: number;
  onStreakFlyComplete?: () => void;
}

const PracticeSummaryScreen: React.FC<PracticeSummaryScreenProps> = ({
  stats,
  streak = 0,
  sessionStartStreak,
  onDone,
  onRetry,
  onAskAlgor,
  onCognitiveFlyComplete,
  onBpFlyComplete,
  onStreakFlyComplete,
}) => {
  const { t } = useLocalization();
  const [step, setStep] = useState(0);
  const [cognitivePhase, setCognitivePhase] = useState<'idle' | 'flying' | 'filled'>('idle');
  /** Центр маскота в HUD (viewport px) — для конечной точки полёта мозгов */
  const [mascotCenter, setMascotCenter] = useState<{ x: number; y: number } | null>(null);
  /** Полёт BP-кристаллов в HUD */
  const [bpPhase, setBpPhase] = useState<'idle' | 'flying' | 'filled'>('idle');
  const [bpFlyStart, setBpFlyStart] = useState<{ x: number; y: number } | null>(null);
  const [bpFlyEnd, setBpFlyEnd] = useState<{ x: number; y: number } | null>(null);
  const bpCardRef = useRef<HTMLDivElement>(null);
  /** Элемент с числом ВР (+75) — откуда летят кристаллы */
  const bpValueRef = useRef<HTMLParagraphElement>(null);
  const onCognitiveFlyCompleteRef = useRef(onCognitiveFlyComplete);
  onCognitiveFlyCompleteRef.current = onCognitiveFlyComplete;
  const onBpFlyCompleteRef = useRef(onBpFlyComplete);
  onBpFlyCompleteRef.current = onBpFlyComplete;
  const onStreakFlyCompleteRef = useRef(onStreakFlyComplete);
  onStreakFlyCompleteRef.current = onStreakFlyComplete;

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const algebraSkillImprovement = stats.total > 0 ? Math.min(9, Math.floor(accuracy / 10) + 3) : 0;

  const BRAIN_COUNT = 8;
  const BP_CRYSTAL_COUNT = 5;
  const FLY_DURATION_MS = 1100;
  const FLY_START_DELAY_MS = 600;
  const BP_FLY_START_DELAY_MS = 900;

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2500),
      setTimeout(() => setStep(4), 3500),
      setTimeout(() => setStep(5), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const BRAINS_ARRIVE_MS = FLY_START_DELAY_MS + FLY_DURATION_MS;

  // Замер центра маскота в HUD при появлении блока с XP (step >= 2), чтобы мозги прилетали ровно в центр маскота
  useEffect(() => {
    if (step < 2) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('[data-mascot-anchor]');
      if (el) {
        const r = el.getBoundingClientRect();
        setMascotCenter({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  // Замер позиции числа ВР (или карточки) и якоря BP в HUD для полёта кристаллов (step >= 4)
  useEffect(() => {
    if (step < 4) return;
    const id = requestAnimationFrame(() => {
      const valueEl = bpValueRef.current;
      const card = bpCardRef.current;
      const targetEl = document.querySelector('[data-bp-anchor]');
      const elToMeasure = valueEl ?? card;
      if (elToMeasure) {
        const r = elToMeasure.getBoundingClientRect();
        setBpFlyStart({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      if (targetEl) {
        const r = targetEl.getBoundingClientRect();
        setBpFlyEnd({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  // Запуск полёта BP-кристаллов после появления карточки BP; колбэк когда первый кристалл долетел до HUD
  useEffect(() => {
    if (step < 4 || !bpFlyEnd) return;
    const tStart = setTimeout(() => setBpPhase('flying'), BP_FLY_START_DELAY_MS);
    const tFilled = setTimeout(() => setBpPhase('filled'), BP_FLY_START_DELAY_MS + FLY_DURATION_MS);
    const tFirstArrive = setTimeout(() => {
      onBpFlyCompleteRef.current?.();
      onStreakFlyCompleteRef.current?.();
    }, BP_FLY_START_DELAY_MS + FLY_DURATION_MS);
    return () => {
      clearTimeout(tStart);
      clearTimeout(tFilled);
      clearTimeout(tFirstArrive);
    };
  }, [step, bpFlyEnd]);

  // Запуск полёта мозгов один раз при step >= 2; колбэк роста кольца — в момент прилёта мозгов
  useEffect(() => {
    if (step < 2) return;
    const tStart = setTimeout(() => setCognitivePhase('flying'), FLY_START_DELAY_MS);
    const tFilled = setTimeout(() => {
      setCognitivePhase('filled');
      onCognitiveFlyCompleteRef.current?.();
    }, BRAINS_ARRIVE_MS);
    return () => {
      clearTimeout(tStart);
      clearTimeout(tFilled);
    };
  }, [step]);

  const RewardItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
  }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
      <div className="flex items-center">
        <span className="flex items-center justify-center w-10 h-10 mr-3 text-3xl [&_svg]:w-8 [&_svg]:h-8">{icon}</span>
        <div>
          <p className="text-sm font-bold text-white/80">{label}</p>
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" aria-hidden />
      <style>{`.bg-grid-pattern { background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 2rem 2rem; }`}</style>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 scroll-smooth flex flex-col"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 5rem)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className={`flex flex-col text-center transition-all duration-500 ${step > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
            <TutorAvatarIcon className="w-full h-full" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{t('practice.summary_title')}</h1>
          <p className="text-base text-gray-400">{t('practice.summary_subtitle')}</p>

          <div className="space-y-3 mt-8 max-w-sm mx-auto w-full flex-shrink-0">
            {step >= 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center min-w-0">
                    <span className="flex items-center justify-center w-10 h-10 mr-3 text-3xl flex-shrink-0" style={{ filter: 'drop-shadow(0 0 10px rgba(91, 140, 255, 0.6))' }}>🧠</span>
                    <p className="text-sm font-bold text-white/80">{t('practice.summary_cognitive')}</p>
                  </div>
                  <p className="text-2xl font-black text-white flex-shrink-0 ml-2">+{stats.xpEarned}</p>
                </div>
              </div>
            )}

            {/* Мозги летят в HUD (круг с вороной) — fixed overlay, конечная точка = центр маскота */}
            {cognitivePhase === 'flying' && (
              <>
                <style>{`
                  @keyframes brain-fly-to-hud {
                    0% { left: 82%; top: 42vh; transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    99% { left: var(--mascot-x, 50%); top: var(--mascot-y, 7vh); transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
                    100% { left: var(--mascot-x, 50%); top: var(--mascot-y, 7vh); transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                  }
                `}</style>
                <div
                  className="fixed inset-0 pointer-events-none z-[200]"
                  aria-hidden
                  style={
                    mascotCenter
                      ? { ['--mascot-x' as string]: `${mascotCenter.x}px`, ['--mascot-y' as string]: `${mascotCenter.y}px` }
                      : undefined
                  }
                >
                  {Array.from({ length: BRAIN_COUNT }, (_, i) => (
                    <span
                      key={i}
                      className="absolute text-lg"
                      style={{
                        left: '82%',
                        top: '42vh',
                        transform: 'translate(-50%, -50%)',
                        animation: `brain-fly-to-hud ${FLY_DURATION_MS}ms ease-out forwards`,
                        animationDelay: `${i * 55}ms`,
                        filter: 'drop-shadow(0 0 6px rgba(91, 140, 255, 0.6))',
                      }}
                    >
                      🧠
                    </span>
                  ))}
                </div>
              </>
            )}
            {/* Кристаллы BP летят в HUD (иконка BP в шапке) */}
            {bpPhase === 'flying' && bpFlyEnd && (
              <>
                <style>{`
                  @keyframes bp-fly-to-hud {
                    0% { left: var(--bp-sx, 50%); top: var(--bp-sy, 55vh); transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    99% { left: var(--bp-ex); top: var(--bp-ey); transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
                    100% { left: var(--bp-ex); top: var(--bp-ey); transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
                  }
                `}</style>
                <div
                  className="fixed inset-0 pointer-events-none z-[200]"
                  aria-hidden
                  style={{
                    ['--bp-sx' as string]: bpFlyStart ? `${bpFlyStart.x}px` : '50%',
                    ['--bp-sy' as string]: bpFlyStart ? `${bpFlyStart.y}px` : '55vh',
                    ['--bp-ex' as string]: `${bpFlyEnd.x}px`,
                    ['--bp-ey' as string]: `${bpFlyEnd.y}px`,
                  }}
                >
                  {Array.from({ length: BP_CRYSTAL_COUNT }, (_, i) => (
                    <span
                      key={i}
                      className="absolute text-lg"
                      style={{
                        left: bpFlyStart ? `${bpFlyStart.x}px` : '50%',
                        top: bpFlyStart ? `${bpFlyStart.y}px` : '55vh',
                        transform: 'translate(-50%, -50%)',
                        animation: `bp-fly-to-hud ${FLY_DURATION_MS}ms ease-out forwards`,
                        animationDelay: `${i * 60}ms`,
                        filter: 'drop-shadow(0 0 6px rgba(138, 124, 255, 0.6))',
                      }}
                    >
                      <span style={{ color: '#8A7CFF' }}><CrystalIcon className="w-6 h-6 inline-block" /></span>
                    </span>
                  ))}
                </div>
              </>
            )}
            {step >= 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <RewardItem
                  icon={<span style={{ filter: 'drop-shadow(0 0 8px rgba(255, 140, 80, 0.6))' }}><TargetIcon className="w-8 h-8 text-[#FF8C50]" /></span>}
                  label={t('practice.summary_accuracy')}
                  value={`${accuracy}%`}
                />
              </div>
            )}
            {step >= 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <RewardItem
                  icon={<span className="text-2xl leading-none">🔥</span>}
                  label={t('practice.summary_streak')}
                  value={String(streak)}
                />
              </div>
            )}
            {step >= 4 && (
              <div ref={bpCardRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center min-w-0">
                    <span className="flex items-center justify-center w-10 h-10 mr-3 text-3xl flex-shrink-0" style={{ filter: 'drop-shadow(0 0 10px rgba(138, 124, 255, 0.6))' }}>
                      <CrystalIcon className="w-8 h-8" />
                    </span>
                    <p className="text-sm font-bold text-white/80">{t('practice.summary_brain_points')}</p>
                  </div>
                  <p ref={bpValueRef} className="text-2xl font-black text-white flex-shrink-0 ml-2">
                    {stats.bpEarned !== undefined ? `+${stats.bpEarned}` : `+${algebraSkillImprovement}%`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={`mt-6 space-y-3 transition-opacity duration-500 flex-shrink-0 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>
            <button type="button" onClick={onDone} className="w-full bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white font-bold py-4 rounded-xl text-base active:scale-[0.98]">
              {t('assessment.done')}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onRetry} className="w-full bg-white/10 text-white/80 font-bold py-3 rounded-xl text-sm active:scale-[0.98]">
                {t('practice.summary_review')}
              </button>
              <button type="button" onClick={onAskAlgor ?? onDone} className="w-full bg-white/10 text-white/80 font-bold py-3 rounded-xl text-sm active:scale-[0.98]">
                {t('practice.summary_ask')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSummaryScreen;
