
import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { ACHIEVEMENTS_LIST, PLAYER_LEVELS } from '../../mockData';
import BrainIcon from '../../components/icons/BrainIcon';

interface AchievementsScreenProps {
  onBack: () => void;
  xp: number;
  unlockedAchievements: string[];
}

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onBack, xp, unlockedAchievements }) => {
  const { t } = useLocalization();

  const currentLevel = PLAYER_LEVELS.slice().reverse().find(level => xp >= level.minXp) || PLAYER_LEVELS[0];
  const nextLevel = PLAYER_LEVELS.find(level => xp < level.minXp);
  const progressToNextLevel = nextLevel ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100 : 100;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('dashboard.achievements')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Level Progress */}
        <div className="bg-gradient-to-br from-[#1A1D24] to-[#121826] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
             <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.level')}</p>
                    <p className="text-3xl font-black text-white">{currentLevel.name}</p>
                </div>
                <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border-2 ${currentLevel.badgeColor} rounded-full bg-black/30`}>
                    {xp.toLocaleString()} XP
                </div>
             </div>
             <div className="w-full bg-black/30 rounded-full h-2.5 border border-white/5 mb-2">
                <div className="bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] h-full rounded-full" style={{ width: `${progressToNextLevel}%` }}></div>
             </div>
             <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>{currentLevel.minXp} XP</span>
                <span>{nextLevel ? `${t('dashboard.nextLevel')}: ${nextLevel.name}` : 'Max Level'}</span>
             </div>
        </div>

        {/* Achievements Grid */}
        <div>
            <h2 className="text-xl font-bold mb-4">{t('dashboard.achievements')}</h2>
            <div className="grid grid-cols-3 gap-4">
                {ACHIEVEMENTS_LIST.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                        <div key={ach.id} className={`aspect-square flex flex-col items-center justify-center text-center p-3 rounded-2xl border transition-opacity ${isUnlocked ? 'bg-white/5 border-white/10' : 'border-dashed border-white/10 opacity-50'}`}>
                            <div className={`text-4xl mb-2 transition-transform ${isUnlocked ? 'scale-100' : 'scale-90'}`}>{ach.icon}</div>
                            <p className="text-[11px] font-bold text-white leading-tight">{ach.name}</p>
                            <p className="text-[9px] text-gray-400 mt-1 leading-tight">{isUnlocked ? ach.description : t('dashboard.locked')}</p>
                        </div>
                    );
                })}
            </div>
        </div>
      </main>
    </div>
  );
};

export default AchievementsScreen;
