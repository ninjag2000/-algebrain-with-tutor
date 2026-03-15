
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
// FIX: DailyChallenge should be imported from types.ts, not mockData.ts
import { generateDailyChallenge, type PreparationLevel } from '../../mockData';
import { DailyChallenge } from '../../types';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';

interface DailyChallengeHubScreenProps {
  onBack: () => void;
  onStart: () => void;
  challengeState: {
    streak: number;
    bestStreak: number;
    completedToday: boolean;
  };
  preparationLevel?: PreparationLevel;
}

const CountdownTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow.getTime() - now.getTime();
            
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return <span className="font-mono tracking-tighter">{timeLeft}</span>;
};


const DailyChallengeHubScreen: React.FC<DailyChallengeHubScreenProps> = ({ onBack, onStart, challengeState, preparationLevel }) => {
  const { t } = useLocalization();
  const [challenge] = useState<DailyChallenge>(() => generateDailyChallenge(preparationLevel));

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white overflow-hidden">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('challenge.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
        <div>
            <div className="text-center mb-6">
                <h2 className="text-4xl font-black tracking-tighter text-white">🔥 {t('challenge.title')}</h2>
                <div className="mt-2 text-sm text-gray-400">{t('challenge.next_in')} <CountdownTimer /></div>
            </div>

            {challengeState.completedToday ? (
                 <div className="bg-gradient-to-br from-green-500/10 to-transparent p-8 rounded-[28px] border border-green-500/30 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <span className="text-5xl mb-4 inline-block">🎉</span>
                    <h3 className="text-2xl font-bold text-white mb-2">{t('challenge.completed_title')}</h3>
                    <p className="text-base text-gray-400">{t('challenge.completed_subtitle')}</p>
                </div>
            ) : (
                <>
                    <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl rounded-[28px] p-8 border border-[#5B8CFF]/20 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#5B8CFF]/10 to-transparent"></div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-[#5B8CFF] uppercase tracking-widest mb-3">{t('challenge.todays_mission')}</h3>
                            <p className="text-2xl font-extrabold text-white mb-4">{challenge.title}</p>
                            <div className="text-sm text-gray-400 space-y-1 mb-6">
                                <p>{challenge.description}</p>
                                <p>Difficulty: Adaptive AI</p>
                                <p>Reward: +{challenge.reward} XP + IQ Boost</p>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/10 text-xs italic text-gray-400">
                                <span className="font-bold text-purple-400">{t('challenge.algor_says')} </span> "{challenge.aiNarrative}"
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>

        <div className="pb-safe mt-6">
            <div className="flex justify-around items-center text-center bg-white/5 p-4 rounded-2xl mb-6">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl leading-none flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 140, 80, 0.5))' }}>🔥</span>
                    <p className="text-2xl font-black">{challengeState.streak}</p>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('challenge.current_streak')}</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl leading-none flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 140, 80, 0.5))' }}>🔥</span>
                    <p className="text-2xl font-black">{challengeState.bestStreak}</p>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('challenge.best_streak')}</p>
                </div>
            </div>
            
            {!challengeState.completedToday && (
                <button onClick={onStart} className="w-full h-[60px] bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white font-bold py-4 rounded-2xl text-lg shadow-[0_10px_30px_rgba(91,140,255,0.35)] active:scale-[0.97] transition-transform">
                    {t('challenge.start')}
                </button>
            )}
        </div>
      </main>
    </div>
  );
};

export default DailyChallengeHubScreen;
