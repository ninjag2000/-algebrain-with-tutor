import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { DailyChallengeSession, Achievement } from '../../types';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import { computeChallengeRewards } from '../../utils/rewardMultipliers';

interface DailyChallengeSummaryScreenProps {
  session: DailyChallengeSession;
  onDone: () => void;
  onReview: () => void;
  streak: number;
  isPro: boolean;
  newlyUnlockedAchievement: Achievement | null;
}

const DailyChallengeSummaryScreen: React.FC<DailyChallengeSummaryScreenProps> = ({ session, onDone, onReview, streak, isPro, newlyUnlockedAchievement }) => {
  const { t } = useLocalization();
  const [step, setStep] = useState(0);

  const correctAnswers = session.answers.filter(a => a.isCorrect).length;
  const totalQuestions = session.challenge.questions.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const baseXpPerQuestion = totalQuestions > 0 ? (session.challenge.reward || 120) / totalQuestions : 0;
  const baseBpPerQuestion = totalQuestions > 0 ? session.challenge.brainPoints / totalQuestions : 0;
  const { xpGained, bpGained } = computeChallengeRewards(session.answers, baseXpPerQuestion, baseBpPerQuestion, isPro);
  const oldStreak = challengeWasCompletedYesterday() ? streak - 1 : 0;

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),  // Initial fade-in
      setTimeout(() => setStep(2), 1500), // XP animates
      setTimeout(() => setStep(3), 2500), // Streak animates
      setTimeout(() => setStep(4), 3500), // Brain Points animate
      setTimeout(() => setStep(5), newlyUnlockedAchievement ? 4500 : 4000), // Achievement / Buttons
    ];
    return () => timers.forEach(clearTimeout);
  }, [newlyUnlockedAchievement]);

  function challengeWasCompletedYesterday() {
    // This is a simplified logic, a robust one would check dates.
    return streak > 1;
  }

  const RewardItem: React.FC<{ icon: React.ReactNode; label: string; value: string; proBonus?: boolean }> = ({ icon, label, value, proBonus }) => (
    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
      <div className="flex items-center">
        <span className="flex items-center justify-center w-10 h-10 mr-3 text-3xl">{icon}</span>
        <div>
          <p className="text-sm font-bold text-white/80">{label}</p>
          {proBonus && <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">x2 PRO BONUS</p>}
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );

  const AnimatedCounter: React.FC<{ to: number, from?: number, delay: number }> = ({ to, from = 0, delay }) => {
    const [count, setCount] = useState(from);
    useEffect(() => {
      if (delay > step) return;
      if (to === from) return;
      const duration = 800;
      const frameRate = 60;
      const totalFrames = Math.round((duration / 1000) * frameRate);
      let frame = 0;
      const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        setCount(Math.round(from + (to - from) * progress));
        if (frame === totalFrames) {
          clearInterval(counter);
        }
      }, 1000 / frameRate);
      return () => clearInterval(counter);
    }, [to, from, delay, step]);
    return <span>{count}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" aria-hidden />
      <style>{`.bg-grid-pattern { background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 2rem 2rem; }`}</style>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 scroll-smooth"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className={`flex flex-col text-center transition-all duration-500 ${step > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
            <TutorAvatarIcon className="w-full h-full" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Intelligence Upload</h1>
          <p className="text-base text-gray-400">Challenge data processed.</p>

          <div className="space-y-3 mt-8 max-w-sm mx-auto w-full">
            {step >= 2 && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><RewardItem icon={<span className="text-3xl leading-none inline-block" style={{ filter: 'drop-shadow(0 0 10px rgba(91, 140, 255, 0.6))' }}>🧠</span>} label={t('dashboard.brainXp')} value={`+${xpGained}`} /></div>}
            {step >= 3 && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><RewardItem icon={<span className="text-3xl leading-none inline-block" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 140, 80, 0.6))' }}>🔥</span>} label={t('dashboard.dailyStreak')} value={`${oldStreak} → ${streak}`} /></div>}
            {step >= 4 && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><RewardItem icon={<span className="text-3xl leading-none inline-block" style={{ filter: 'drop-shadow(0 0 10px rgba(138, 124, 255, 0.6))' }}>💠</span>} label="Brain Points" value={`+${bpGained}`} proBonus={isPro} /></div>}
            {step >= 5 && newlyUnlockedAchievement && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 text-center">
                <div className="inline-block bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4">
                  <p className="text-xs font-bold text-yellow-300 uppercase tracking-widest">Achievement Unlocked!</p>
                  <p className="text-lg font-bold text-white mt-1">{newlyUnlockedAchievement.icon} {newlyUnlockedAchievement.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className={`mt-8 space-y-3 transition-opacity duration-500 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>
            <button type="button" onClick={() => onDone()} className="w-full bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white font-bold py-4 rounded-xl text-base active:scale-[0.98]">
              {t('assessment.done')}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onReview()} className="w-full bg-white/10 text-white/80 font-bold py-3 rounded-xl text-sm active:scale-[0.98]">
                {t('challenge.review')}
              </button>
              <button type="button" onClick={() => {}} className="w-full bg-white/10 text-white/80 font-bold py-3 rounded-xl text-sm active:scale-[0.98]">
                {t('challenge.share')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeSummaryScreen;
