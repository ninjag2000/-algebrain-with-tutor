import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { PLAYER_LEVELS } from '../mockData';
import { TutorAvatarIcon } from './icons/TutorAvatarIcon';
import CrystalIcon from './icons/CrystalIcon';

interface TopStatusBarHUDProps {
  streak: number;
  xp: number;
  brainPoints: number;
  showDailyBadge?: boolean;
  /** Встроенный режим: без fixed, для вставки в шапку (напр. Chat) */
  inline?: boolean;
  /** Триггер анимации роста шкалы прогресса (например после прилёта мозгов на summary). Меняйте значение (например Date.now()) чтобы запустить рост кольца от 0 до текущего прогресса. */
  progressGrowTrigger?: number;
  /** Показывать кольцо с этим значением (0..1), пока не сработает progressGrowTrigger. Нужно для summary: кольцо остаётся пустым до прилёта мозгов, затем растёт. */
  ringProgressBeforeGrow?: number | null;
  /** На summary: показывать в HUD столько ВР, сколько было до сессии; при срабатывании bpGrowthTrigger — анимация роста до brainPoints. */
  brainPointsBeforeSession?: number | null;
  /** Триггер анимации роста числа ВР (когда первый BP-кристалл долетел до HUD). */
  bpGrowthTrigger?: number;
  /** На summary: показывать в HUD стрик до сессии; при streakGrowthTrigger — анимация роста до streak. */
  streakBeforeSession?: number | null;
  /** Триггер анимации роста стрика (при прилёте кристаллов на summary). */
  streakGrowthTrigger?: number;
}

const GLASS_NEURAL = {
  background: 'rgba(15, 18, 30, 0.7)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
};

const formatBP = (n: number) => n.toLocaleString();

const RING_GROW_DURATION_MS = 1800;

const TopStatusBarHUD: React.FC<TopStatusBarHUDProps> = ({
  streak,
  xp,
  brainPoints,
  showDailyBadge = false,
  inline = false,
  progressGrowTrigger,
  ringProgressBeforeGrow = null,
  brainPointsBeforeSession = null,
  bpGrowthTrigger,
  streakBeforeSession = null,
  streakGrowthTrigger,
}) => {
  const gradientId = useId().replace(/:/g, '') || 'hudXpRing';
  const [animatedXpGains, setAnimatedXpGains] = useState<{ id: number; amount: number }[]>([]);
  const [xpBump, setXpBump] = useState(false);
  const [bpBump, setBpBump] = useState(false);
  const [streakGlow, setStreakGlow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ringDisplayProgress, setRingDisplayProgress] = useState<number | null>(null);
  /** Отображаемое число ВР: при brainPointsBeforeSession + bpGrowthTrigger — анимация от старого к новому. */
  const [displayBp, setDisplayBp] = useState<number>(brainPoints);
  /** Отображаемое число стрика: при streakBeforeSession + streakGrowthTrigger — анимация от старого к новому. */
  const [displayStreak, setDisplayStreak] = useState<number>(streak);
  const prevXpRef = useRef(xp);
  const prevBpRef = useRef(brainPoints);
  const prevStreakRef = useRef(streak);
  const growTriggerRef = useRef(progressGrowTrigger);
  const bpGrowthTriggerRef = useRef(bpGrowthTrigger);
  const streakGrowthTriggerRef = useRef(streakGrowthTrigger);

  useEffect(() => {
    if (xp > prevXpRef.current) {
      const diff = xp - prevXpRef.current;
      setAnimatedXpGains(prev => [...prev, { id: Date.now(), amount: diff }]);
      setXpBump(true);
      const t = setTimeout(() => setXpBump(false), 700);
      return () => clearTimeout(t);
    }
    prevXpRef.current = xp;
  }, [xp]);

  // На summary до прилёта кристаллов показываем ВР до сессии (вычисляемое значение — без задержки первого кадра)
  const showBpBeforeSession = brainPointsBeforeSession != null && (bpGrowthTrigger == null || bpGrowthTrigger === 0);
  const displayedBp = showBpBeforeSession ? brainPointsBeforeSession! : displayBp;

  const showStreakBeforeSession = streakBeforeSession != null && (streakGrowthTrigger == null || streakGrowthTrigger === 0);
  const displayedStreak = showStreakBeforeSession ? streakBeforeSession! : displayStreak;

  useEffect(() => {
    if (brainPointsBeforeSession == null) {
      setDisplayBp(brainPoints);
    }
  }, [brainPointsBeforeSession, brainPoints]);

  useEffect(() => {
    if (bpGrowthTrigger == null || bpGrowthTrigger === 0 || bpGrowthTrigger === bpGrowthTriggerRef.current) return;
    if (brainPointsBeforeSession == null) return;
    bpGrowthTriggerRef.current = bpGrowthTrigger;
    const startBp = brainPointsBeforeSession;
    const endBp = brainPoints;
    const BP_GROW_DURATION_MS = 900;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / BP_GROW_DURATION_MS, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setDisplayBp(Math.round(startBp + ease * (endBp - startBp)));
      if (t < 1) requestAnimationFrame(tick);
      else setDisplayBp(endBp);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [bpGrowthTrigger, brainPointsBeforeSession, brainPoints]);

  useEffect(() => {
    if (brainPointsBeforeSession != null && (bpGrowthTrigger == null || bpGrowthTrigger === 0)) return;
    if (brainPoints > prevBpRef.current) {
      setBpBump(true);
      const t = setTimeout(() => setBpBump(false), 500);
      prevBpRef.current = brainPoints;
      return () => clearTimeout(t);
    }
    prevBpRef.current = brainPoints;
  }, [brainPoints, brainPointsBeforeSession, bpGrowthTrigger]);

  useEffect(() => {
    if (streakBeforeSession == null) {
      setDisplayStreak(streak);
    }
  }, [streakBeforeSession, streak]);

  useEffect(() => {
    if (streakGrowthTrigger == null || streakGrowthTrigger === 0 || streakGrowthTrigger === streakGrowthTriggerRef.current) return;
    if (streakBeforeSession == null) return;
    streakGrowthTriggerRef.current = streakGrowthTrigger;
    const startStreak = streakBeforeSession;
    const endStreak = streak;
    const STREAK_GROW_DURATION_MS = 900;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / STREAK_GROW_DURATION_MS, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setDisplayStreak(Math.round(startStreak + ease * (endStreak - startStreak)));
      if (t < 1) requestAnimationFrame(tick);
      else setDisplayStreak(endStreak);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [streakGrowthTrigger, streakBeforeSession, streak]);

  useEffect(() => {
    if (streak > prevStreakRef.current && streak > 0) {
      setStreakGlow(true);
      const t = setTimeout(() => setStreakGlow(false), 400);
      prevStreakRef.current = streak;
      return () => clearTimeout(t);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  const currentLevel = useMemo(
    () => PLAYER_LEVELS.slice().reverse().find(level => xp >= level.minXp) || PLAYER_LEVELS[0],
    [xp]
  );
  const nextLevel = useMemo(() => PLAYER_LEVELS.find(level => xp < level.minXp), [xp]);
  const levelIndex = PLAYER_LEVELS.indexOf(currentLevel);

  const levelProgress = useMemo(() => {
    if (!nextLevel) return 1;
    const levelXpRange = nextLevel.minXp - currentLevel.minXp;
    const xpIntoLevel = xp - currentLevel.minXp;
    return Math.min(xpIntoLevel / levelXpRange, 1);
  }, [xp, currentLevel, nextLevel]);

  const growFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (progressGrowTrigger == null || progressGrowTrigger === 0 || progressGrowTrigger === growTriggerRef.current) return;
    growTriggerRef.current = progressGrowTrigger;
    const startProgress = ringProgressBeforeGrow ?? 0;
    setRingDisplayProgress(startProgress);
    const start = performance.now();
    const targetProgress = levelProgress;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / RING_GROW_DURATION_MS, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setRingDisplayProgress(startProgress + ease * (targetProgress - startProgress));
      if (t < 1) growFrameRef.current = requestAnimationFrame(tick);
      else setRingDisplayProgress(null);
    };
    growFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (growFrameRef.current != null) cancelAnimationFrame(growFrameRef.current);
      growFrameRef.current = null;
    };
  }, [progressGrowTrigger, levelProgress, ringProgressBeforeGrow]);

  const nextRewardBp = 200;
  const ringR = 10;
  const ringC = 2 * Math.PI * ringR;
  const progressForRing = ringDisplayProgress !== null ? ringDisplayProgress : (ringProgressBeforeGrow ?? levelProgress);
  const ringOffset = ringC - progressForRing * ringC;

  const buttonContent = (
    <>
          {/* 1️⃣ Streak (left) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`flex items-center gap-1 ${streakGlow ? 'animate-hud-streak-glow' : ''}`}
              style={{ filter: 'drop-shadow(0 0 6px rgba(255, 140, 80, 0.5))' }}
            >
              <span className="flex-shrink-0 text-sm leading-none">🔥</span>
              <span className="text-[#E6E9F2] font-medium tabular-nums" style={{ fontSize: '10px' }}>
                {displayedStreak}
              </span>
            </div>
            {showDailyBadge && (
              <span
                className="flex items-center gap-0.5 rounded-full bg-cyan-500/20 px-1 py-0.5 text-[8px] font-semibold text-cyan-300 animate-hud-daily-pulse"
                style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
              >
                🎯 Daily
              </span>
            )}
          </div>

          <span className="text-white/20 font-light mx-0.5" style={{ fontSize: '8px' }}>|</span>

          <div className={`relative flex items-center gap-1.5 flex-shrink-0 ${xpBump ? 'animate-hud-xp-bump' : ''}`}>
            <div className="relative w-7 h-7 flex items-center justify-center" data-mascot-anchor aria-hidden>
              <svg className="absolute w-7 h-7 -rotate-90" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5B8CFF" />
                    <stop offset="100%" stopColor="#8A7CFF" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                <circle
                  cx="12"
                  cy="12"
                  r={ringR}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="2"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className={ringDisplayProgress === null ? 'transition-all duration-700 ease-out' : ''}
                  style={{ filter: ringDisplayProgress !== null ? 'drop-shadow(0 0 8px rgba(91, 140, 255, 0.8))' : 'drop-shadow(0 0 4px rgba(91, 140, 255, 0.4))' }}
                />
              </svg>
              <div className="relative w-4 h-4 flex items-center justify-center rounded-full overflow-hidden ring-1 ring-white/10" style={{ filter: 'drop-shadow(0 0 4px rgba(91, 140, 255, 0.5))' }}>
                <TutorAvatarIcon className="w-full h-full object-cover" variant="mascot" />
              </div>
            </div>
            <span className="text-[#E6E9F2] font-medium tabular-nums" style={{ fontSize: '10px', textShadow: '0 0 8px rgba(91, 140, 255, 0.5)' }}>
              Lv.{levelIndex + 1}
            </span>
          </div>

          {animatedXpGains.map(gain => (
            <span
              key={gain.id}
              className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold text-[#5B8CFF] animate-hud-xp-float pointer-events-none whitespace-nowrap"
              style={{ textShadow: '0 0 10px rgba(91, 140, 255, 0.9)' }}
              onAnimationEnd={() => setAnimatedXpGains(prev => prev.filter(a => a.id !== gain.id))}
            >
              +{gain.amount} XP
            </span>
          ))}

          <span className="text-white/20 font-light mx-0.5" style={{ fontSize: '9px' }}>|</span>

          <div
            className={`flex items-center gap-1 flex-shrink-0 ${bpBump ? 'animate-hud-bp-bounce' : ''}`}
            style={{ color: '#8A7CFF', filter: 'drop-shadow(0 0 6px rgba(138, 124, 255, 0.5))' }}
            data-bp-anchor
            aria-hidden
          >
            <CrystalIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[#E6E9F2] font-semibold tabular-nums" style={{ fontSize: '10px', textShadow: '0 0 6px rgba(138, 124, 255, 0.4)' }}>
              {formatBP(displayedBp)}
            </span>
          </div>
    </>
  );

  return (
    <>
      <div
        className={inline ? 'flex items-center w-full min-w-0' : 'fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-lg'}
        style={inline ? undefined : { paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 44px)' }}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`relative flex items-center justify-between rounded-[16px] transition-transform active:scale-[0.98] w-full ${inline ? 'gap-1.5 py-1.5 px-2.5' : 'py-2 px-3'}`}
          style={inline ? { ...GLASS_NEURAL, borderRadius: 12 } : GLASS_NEURAL}
        >
          {buttonContent}
        </button>
      </div>

      {/* Progress Sheet (tap on HUD) */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center"
          onClick={() => setSheetOpen(false)}
          onKeyDown={e => e.key === 'Escape' && setSheetOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <div
            className="relative w-full max-w-sm rounded-t-3xl p-6 pb-safe shadow-2xl"
            style={{
              background: 'rgba(15, 18, 30, 0.95)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-[#E6E9F2]">
                Level {levelIndex + 1} — {currentLevel.name}
              </h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-[#9AA3B2] p-2 -m-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[#9AA3B2]">XP</span>
                  <span className="text-[#E6E9F2] font-semibold tabular-nums">
                    {nextLevel
                      ? `${xp - currentLevel.minXp} / ${nextLevel.minXp - currentLevel.minXp}`
                      : `${xp} (max)`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${levelProgress * 100}%`,
                      background: 'linear-gradient(90deg, #5B8CFF, #8A7CFF)',
                      boxShadow: '0 0 12px rgba(91, 140, 255, 0.5), 0 0 6px rgba(138, 124, 255, 0.3)',
                    }}
                  />
                </div>
              </div>
              {nextLevel && (
                <p className="text-[#9AA3B2] text-xs">
                  Next reward:
                  <br />
                  <span className="text-[#8A7CFF] font-semibold" style={{ textShadow: '0 0 8px rgba(138, 124, 255, 0.5)' }}>+{nextRewardBp} Brain Points</span>
                  <br />
                  <span className="text-[#9AA3B2]/80">+ New Theme Unlock</span>
                </p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-lg leading-none" style={{ filter: 'drop-shadow(0 0 6px rgba(255, 140, 80, 0.5))' }}>🔥</span>
                <span className="text-[#E6E9F2] font-medium">
                  {streak} Day Streak
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopStatusBarHUD;
