import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { PLAYER_LEVELS } from '../mockData';
import type { SkillStats, SkillKey } from './assessment/types';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';
import CrystalIcon from '../components/icons/CrystalIcon';

const CARD_STYLE = 'backdrop-blur-[20px] border border-[#FFFFFF10] rounded-[24px] bg-[#121826]/80';

type SkillStatus = 'mastered' | 'pro' | 'improving' | 'needs_focus';

interface SkillItem {
  key: string;
  percent: number;
  status: SkillStatus;
  icon: string;
}

interface DashboardScreenProps {
  xp: number;
  streak: number;
  brainPoints: number;
  showDailyBadge?: boolean;
  isPro: boolean;
  dailyGoal?: number;
  dailyTasksCompleted?: number;
  onNavigateToSettings: () => void;
  onNavigateToLanguage: () => void;
  onNavigateToFloatingBall: () => void;
  onOpenPaywall: () => void;
  onNavigateToHistory: () => void;
  onNavigateToCollection: () => void;
  onNavigateToAchievements: () => void;
  onNavigateToPracticeHub?: () => void;
  onNavigateToPracticeForSkill?: (skillKey: SkillKey) => void;
  onStartWeakPractice?: (skillKeys: SkillKey[]) => void;
  onClearChat: () => void;
  onClearHistory: () => void;
  onStartAssessment: () => void;
  onStartDailyChallenge: () => void;
  dailyChallengeState: { streak: number; bestStreak: number; completedToday: boolean };
  dashboardPlan?: { day: number; topic: string; duration: string }[] | null;
  onStartPlan?: (plan: { day: number; topic: string; duration: string }[]) => void;
  skillStats?: SkillStats;
  hasPassedAssessment?: boolean;
  /** Решено задач по дням: [сегодня, вчера, ..., 6 дней назад]. Для графика «прогресс за неделю». */
  weeklyProgressData?: number[];
  /** Процент изменения к прошлой неделе (положительный = быстрее). null — нет данных за прошлую неделю. */
  weeklyComparisonPercent?: number | null;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  xp,
  streak,
  brainPoints,
  showDailyBadge = false,
  isPro,
  dailyGoal = 5,
  dailyTasksCompleted = 0,
  onNavigateToSettings,
  onNavigateToLanguage,
  onNavigateToFloatingBall,
  onOpenPaywall,
  onNavigateToHistory,
  onNavigateToCollection,
  onNavigateToAchievements,
  onNavigateToPracticeHub,
  onNavigateToPracticeForSkill,
  onStartWeakPractice,
  onClearChat,
  onClearHistory,
  onStartAssessment,
  onStartDailyChallenge,
  dailyChallengeState,
  dashboardPlan,
  onStartPlan,
  skillStats,
  hasPassedAssessment = false,
  weeklyProgressData = [],
  weeklyComparisonPercent = null,
}) => {
  const { t } = useLocalization();

  const currentLevel = useMemo(
    () => PLAYER_LEVELS.slice().reverse().find(level => xp >= level.minXp) || PLAYER_LEVELS[0],
    [xp]
  );
  const nextLevel = useMemo(() => PLAYER_LEVELS.find(level => xp < level.minXp), [xp]);
  const xpIntoCurrent = nextLevel ? xp - currentLevel.minXp : 0;
  const xpNeededForNext = nextLevel ? nextLevel.minXp - currentLevel.minXp : 0;
  const levelProgress = xpNeededForNext ? Math.min(100, (xpIntoCurrent / xpNeededForNext) * 100) : 100;
  const logicGrowthPercent = Math.round(levelProgress);

  const skills: SkillItem[] = useMemo(() => {
    const statToItem = (
      key: 'skill_arithmetic' | 'skill_equations' | 'skill_logarithms' | 'skill_trigonometry',
      data: { correct: number; total: number },
      icon: string
    ): SkillItem => {
      const percent = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 50;
      const status: SkillStatus = percent >= 80 ? 'mastered' : percent >= 60 ? 'pro' : percent >= 40 ? 'improving' : 'needs_focus';
      return { key, percent, status, icon };
    };
    const stats = skillStats ?? {
      arithmetic: { correct: 0, total: 0 },
      equations: { correct: 0, total: 0 },
      logarithms: { correct: 0, total: 0 },
      trigonometry: { correct: 0, total: 0 },
    };
    return [
      statToItem('skill_arithmetic', stats.arithmetic, '🧮'),
      statToItem('skill_equations', stats.equations, '⚖️'),
      statToItem('skill_logarithms', stats.logarithms, '📈'),
      statToItem('skill_trigonometry', stats.trigonometry, '📐'),
    ];
  }, [skillStats]);

  const weeklyData = weeklyProgressData.length >= 7 ? weeklyProgressData.slice(0, 7) : [...weeklyProgressData, ...Array(7 - weeklyProgressData.length).fill(0)];
  const weeklyMax = Math.max(1, ...weeklyData);
  const weeklyDisplayOrder = [...weeklyData].reverse();

  const ListItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    isDangerous?: boolean;
    isSelected?: boolean;
  }> = ({ icon, label, onClick, isDangerous, isSelected }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-4 hover:bg-white/5 rounded-lg transition-colors text-left disabled:opacity-50 ${isDangerous ? 'text-red-400 hover:bg-red-900/20' : 'text-white/80'} ${isSelected ? 'bg-white/5' : ''}`}
      disabled={!onClick}
    >
      {icon}
      <span className="ml-4 font-medium text-sm">{label}</span>
      {isSelected ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#5B8CFF] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      )}
    </button>
  );

  const GlobeIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#5B8CFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2a2 2 0 002-2v-3a2 2 0 012-2h3.945M8 16v.01M12 16v.01M16 16v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

  const statusColor = (status: SkillStatus) => {
    if (status === 'mastered') return 'text-[#22C55E]';
    if (status === 'pro') return 'text-[#5B8CFF]';
    if (status === 'improving') return 'text-[#5B8CFF]';
    return 'text-[#F59E0B]';
  };

  const statusLabel = (status: SkillStatus) => {
    if (status === 'mastered') return t('dashboard.skillStatus_mastered');
    if (status === 'pro') return t('dashboard.skillStatus_pro');
    if (status === 'improving') return t('dashboard.skillStatus_improving');
    return t('dashboard.skillStatus_needs_focus');
  };

  return (
    <div className="h-full overflow-y-auto pb-safe relative min-h-full">
      {/* Фон как в Инструментах */}
      <div className="fixed inset-0 -z-10 bg-[#070910]" aria-hidden />
      <div className="fixed inset-0 -z-10 opacity-100" aria-hidden style={{ background: 'radial-gradient(ellipse 140% 100% at 50% -10%, rgba(91, 140, 255, 0.18), transparent 45%), radial-gradient(ellipse 100% 80% at 90% 30%, rgba(167, 139, 250, 0.12), transparent 40%), radial-gradient(ellipse 80% 100% at 10% 70%, rgba(91, 140, 255, 0.08), transparent 45%), radial-gradient(ellipse 60% 60% at 50% 100%, rgba(139, 92, 246, 0.06), transparent 50%)' }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0B0F1A]/30 via-transparent to-[#0D1220]/50" aria-hidden />

      {/* Шапка как в Инструментах */}
      <header className="sticky top-0 z-50 min-w-0 bg-[#0B0F1A]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="absolute inset-0 -z-10 rounded-b-2xl opacity-90" aria-hidden style={{ boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset' }} />
        <div className="absolute left-0 right-0 bottom-0 h-12 -z-10 pointer-events-none" aria-hidden style={{ background: 'linear-gradient(to bottom, transparent, rgba(11, 15, 26, 0.4) 40%, rgba(7, 9, 16, 0.7) 100%)' }} />
        <div className="relative px-4 pt-5 pb-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img src="/logo.png" alt="AlgeBrain" className="w-10 h-10 flex-shrink-0 rounded-xl object-contain" />
            <h1 className="text-3xl font-black tracking-tighter text-white truncate min-w-0 drop-shadow-sm leading-tight flex items-center min-h-[2.25rem]">{t('nav.profile')}</h1>
          </div>
          <span className="flex-shrink-0 flex items-center justify-center rounded-full p-[2px] w-10 h-10 shadow-[0_0_20px_rgba(91,140,255,0.25),0_0_40px_rgba(167,139,250,0.12),inset_0_0_0_1px_rgba(255,255,255,0.08)]" aria-hidden>
            <TutorAvatarIcon className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 block" variant="mascot" />
          </span>
        </div>
      </header>

      <main className="relative p-6 pt-6 space-y-6">
        <div className="absolute left-0 right-0 top-0 h-8 -z-10 pointer-events-none" aria-hidden style={{ background: 'linear-gradient(to bottom, rgba(11, 15, 26, 0.6), transparent)' }} />
        {/* 1. Когнитивный опыт — уровень, XP, прогресс; тап → Достижения */}
        <button
          type="button"
          onClick={onNavigateToAchievements}
          className={`${CARD_STYLE} p-6 relative overflow-hidden animate-iq-glow-soft w-full text-left active:scale-[0.99] transition-transform`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#5B8CFF]/15 via-transparent to-[#A78BFA]/15 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0 animate-iq-ring-pulse">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#cognitiveGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${levelProgress * 2.64} 264`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="cognitiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#5B8CFF" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white" style={{ filter: 'drop-shadow(0 0 10px rgba(91, 140, 255, 0.6))' }} aria-hidden>🧠</span>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-lg font-bold text-white/90">{t('dashboard.cognitiveExperience')}</h2>
              <p className="text-3xl font-black text-white mt-1" style={{ textShadow: '0 0 20px rgba(91, 140, 255, 0.4)' }}>{xp.toLocaleString()} XP</p>
              <p className="text-sm text-white/70 mt-2">{t('dashboard.level')}: {currentLevel.name}</p>
              <p className="text-sm text-[#A78BFA]">{t('dashboard.logicGrowth')}: +{logicGrowthPercent}%</p>
              {nextLevel && (
                <p className="text-xs text-white/50 mt-1">{nextLevel.minXp - xp} XP → {nextLevel.name}</p>
              )}
            </div>
          </div>
        </button>

        {/* 2. Skill Analytics Grid */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t('dashboard.skillsTitle')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {skills.map((s) => (
              <button
                key={s.key}
                className={`${CARD_STYLE} p-4 text-left active:scale-[0.98] transition-transform min-w-0 relative overflow-hidden ${!hasPassedAssessment ? 'opacity-90' : ''}`}
                onClick={hasPassedAssessment ? () => (onNavigateToPracticeForSkill ? onNavigateToPracticeForSkill(s.key.replace(/^skill_/, '') as SkillKey) : onNavigateToPracticeHub?.()) : onStartAssessment}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  {hasPassedAssessment && <span className="text-lg font-black text-white">{s.percent}%</span>}
                </div>
                <p className="text-sm font-medium text-white/90 mt-1 break-words min-w-0">{t(`dashboard.${s.key}`)}</p>
                {hasPassedAssessment && <p className={`text-xs font-semibold mt-1 ${statusColor(s.status)}`}>{statusLabel(s.status)}</p>}
                {!hasPassedAssessment && (
                  <>
                    <div className="absolute inset-0 bg-[#0B0F1A]/70 backdrop-blur-[1px] z-10" aria-hidden />
                    <div className="absolute top-2 right-2 text-white/90 z-10" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <p className="absolute bottom-3 left-3 right-10 z-10 text-[10px] font-semibold text-white/95 leading-tight">{t('dashboard.skillLockMessage')}</p>
                  </>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Учебный стрик, когнитивный опыт, цель дня */}
        <section className={`${CARD_STYLE} p-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex-shrink-0 animate-streak-flame text-2xl leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 140, 80, 0.6))' }} aria-hidden>🔥</span>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider truncate">{t('dashboard.dailyStreak')}</p>
                <p className="text-xl font-black text-white tabular-nums">{streak} {t('dashboard.days')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex-shrink-0 text-[#A78BFA]" style={{ filter: 'drop-shadow(0 0 8px rgba(138, 124, 255, 0.6))' }} aria-hidden>
                <CrystalIcon className="w-8 h-8" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider truncate">{t('dashboard.brainPoints')}</p>
                <p className="text-xl font-black text-white tabular-nums" style={{ textShadow: '0 0 12px rgba(138, 124, 255, 0.35)' }}>{brainPoints.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-0 sm:col-span-1">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0" aria-hidden>🎯</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider truncate">{t('dashboard.dailyGoal')}</p>
                  <p className="text-xl font-black text-white tabular-nums">{dailyTasksCompleted}/{dailyGoal} {t('dashboard.tasksCompleted')}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] transition-all duration-500"
                  style={{ width: `${dailyGoal ? Math.min(100, (dailyTasksCompleted / dailyGoal) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. AI Weakness Detector — только после испытания; кнопка выдаёт подборку только по проблемным темам */}
        {hasPassedAssessment && (
        <section className={`${CARD_STYLE} p-5 border-[#A78BFA]/20`}>
          <h3 className="text-sm font-bold text-white/90 flex items-center gap-2">
            <span>🧠</span> {t('dashboard.aiInsightTitle')}
          </h3>
          <p className="text-sm text-white/80 mt-2">{(() => {
            const sorted = [...skills].sort((a, b) => a.percent - b.percent);
            const weak = sorted[0];
            const strong = sorted[sorted.length - 1];
            if (!weak || weak.percent >= 80) return t('dashboard.aiInsightAllStrong');
            const weakName = t(`dashboard.${weak.key}`);
            const strongName = strong ? t(`dashboard.${strong.key}`) : '';
            return weak.percent < 40
              ? t('dashboard.aiInsightWeak').replace('{skill}', weakName)
              : t('dashboard.aiInsightImproving').replace('{skill}', weakName).replace('{strong}', strongName || '');
          })()}</p>
          {onStartWeakPractice && (() => {
            const sorted = [...skills].sort((a, b) => a.percent - b.percent);
            const weakSkills = sorted.filter(s => s.percent < 80);
            const weakSkillKeys: SkillKey[] = weakSkills.map(s => (s.key.replace(/^skill_/, '') as SkillKey));
            if (weakSkillKeys.length === 0) return null;
            return (
              <button
                onClick={() => onStartWeakPractice(weakSkillKeys)}
                className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] border border-white/10 active:scale-[0.98] transition-transform"
              >
                {t('dashboard.fixWeakAreas')}
              </button>
            );
          })()}
        </section>
        )}

        {/* 5. Weekly Progress Chart (Premium) */}
        {isPro && (
          <section className={`${CARD_STYLE} p-5`}>
            <h3 className="text-sm font-bold text-white/90 mb-4">{t('dashboard.weeklyProgress')}</h3>
            <div className="h-32 flex items-end gap-1" role="img" aria-label={t('dashboard.weeklyProgress')}>
              {weeklyDisplayOrder.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 min-h-[4px] rounded-t bg-gradient-to-t from-[#5B8CFF] to-[#A78BFA] opacity-80 transition-all duration-300"
                  style={{ height: `${(v / weeklyMax) * 100}%` }}
                  title={String(v)}
                />
              ))}
            </div>
            <p className={`text-xs font-semibold mt-2 ${weeklyComparisonPercent === null ? 'text-white/60' : weeklyComparisonPercent > 0 ? 'text-[#22C55E]' : weeklyComparisonPercent < 0 ? 'text-amber-400' : 'text-white/70'}`}>
              {weeklyComparisonPercent === null
                ? t('dashboard.noDataLastWeek')
                : weeklyComparisonPercent > 0
                  ? `+${weeklyComparisonPercent}% ${t('dashboard.faster')}`
                  : weeklyComparisonPercent < 0
                    ? `${weeklyComparisonPercent}% ${t('dashboard.slower')}`
                    : t('dashboard.sameAsLastWeek')}
            </p>
          </section>
        )}

        {/* 6. Achievements & Level (когнитивный опыт = XP) */}
        <section className={`${CARD_STYLE} p-5`}>
          <h3 className="text-sm font-bold text-white/90 mb-3">{t('dashboard.achievements')}</h3>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5B8CFF] to-[#A78BFA] flex items-center justify-center text-xl font-black text-white">
              {PLAYER_LEVELS.indexOf(currentLevel) + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">{t('dashboard.level')} {PLAYER_LEVELS.indexOf(currentLevel) + 1} — {currentLevel.name}</p>
              <p className="text-xs text-white/70 mt-0.5">{t('dashboard.cognitiveExperience')}: {xp.toLocaleString()} XP</p>
              {nextLevel && (
                <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.nextLevel')}: {nextLevel.name} ({nextLevel.minXp - xp} XP)</p>
              )}
            </div>
          </div>
          <button
            onClick={onNavigateToAchievements}
            className="mt-3 text-sm font-semibold text-[#5B8CFF]"
          >
            {t('dashboard.achievements')} →
          </button>
        </section>

        {/* 7. Algor says + полная аналитика в одном блоке */}
        <section className={`${CARD_STYLE} p-5 border-[#5B8CFF]/20 ${!isPro ? 'border-[#A78BFA]/30' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10" style={{ filter: 'drop-shadow(0 0 6px rgba(91, 140, 255, 0.4))' }}>
              <TutorAvatarIcon className="w-full h-full object-cover" variant="mascot" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{t('challenge.algor_says')}</p>
          </div>
          {isPro ? (
            <div className="mt-2 space-y-2 min-w-0">
              <p className="text-sm text-white/90 break-words">{t('dashboard.algorImproved')}</p>
              <p className="text-xs text-white/70 break-words">{t('dashboard.algorFullAnalytics')}</p>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden>🔒</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="font-bold text-white break-words">{t('dashboard.unlockAnalytics')}</p>
                  <p className="text-xs text-white/70 mt-0.5 break-words">{t('dashboard.upgradeProAnalytics')}</p>
                </div>
              </div>
              <button
                onClick={onOpenPaywall}
                className="flex-shrink-0 py-2 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white active:scale-95 transition-transform"
              >
                {t('dashboard.go')}
              </button>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onStartDailyChallenge}
            className="relative bg-[#121826]/80 backdrop-blur-xl border border-[#5B8CFF]/30 p-5 rounded-2xl flex flex-col items-center text-center active:scale-[0.98] transition-transform"
          >
            <span className="text-3xl mb-2">🗓️</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('challenge.title')}</h3>
            {dailyChallengeState.completedToday && <span className="absolute top-2 right-2 text-[#22C55E] text-sm">✅</span>}
          </button>
          <button
            onClick={dashboardPlan?.length ? () => onStartPlan?.(dashboardPlan) : onStartAssessment}
            className="bg-[#121826]/80 backdrop-blur-xl border border-[#A78BFA]/30 p-5 rounded-2xl flex flex-col items-center text-center active:scale-[0.98] transition-transform"
          >
            <span className="text-3xl mb-2">{dashboardPlan?.length ? '📋' : '🏆'}</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {dashboardPlan?.length ? t('dashboard.plan_tasks') : t('assessment.scan_title')}
            </h3>
          </button>
        </div>

        {/* List items: История, Коллекция, Достижения, Язык */}
        <div className={`${CARD_STYLE} overflow-hidden`}>
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#5B8CFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label={t('profile.history')} onClick={onNavigateToHistory} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} label={t('profile.collection')} onClick={onNavigateToCollection} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#A78BFA]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} label={t('dashboard.achievements')} onClick={onNavigateToAchievements} />
          <ListItem icon={GlobeIcon} label={t('settings.language')} onClick={onNavigateToLanguage} />
        </div>
        <div className={`${CARD_STYLE} overflow-hidden`}>
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>} label={t('profile.floatingBall')} onClick={onNavigateToFloatingBall} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>} label={t('profile.feedback')} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>} label={t('profile.shareApp')} />
        </div>
        <div className={`${CARD_STYLE} overflow-hidden mb-8`}>
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} label={t('profile.deleteChat')} onClick={onClearChat} isDangerous />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} label={t('profile.clearHistory')} onClick={onClearHistory} isDangerous />
        </div>
      </main>
    </div>
  );
};

export default DashboardScreen;
