import React, { useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { SkillKey } from '../assessment/types';

interface PracticeHubScreenProps {
  onBack: () => void;
  onStartPractice: (mode: 'quick' | 'smart' | 'exam' | 'test', questionCount: number, skillKeys?: SkillKey[]) => void;
  onOpenPaywall: () => void;
  isPro: boolean;
  selectedSkill?: SkillKey | null;
  onStartWeakPractice?: (skillKeys: SkillKey[]) => void;
  weakSkillKeys?: SkillKey[];
}

const PracticeHubScreen: React.FC<PracticeHubScreenProps> = ({ onBack, onStartPractice, onOpenPaywall, isPro, selectedSkill = null, onStartWeakPractice, weakSkillKeys }) => {
  const { t } = useLocalization();
  const [selectedMode, setSelectedMode] = useState<'quick' | 'smart' | 'exam' | 'test'>('smart');

  const startSelected = () => {
    if (selectedMode === 'exam' && !isPro) {
      onOpenPaywall();
      return;
    }
    const count = selectedMode === 'quick' ? 5 : selectedMode === 'exam' ? 15 : selectedMode === 'test' ? 5 + Math.floor(Math.random() * 3) : 10;
    onStartPractice(selectedMode, count, selectedSkill ? [selectedSkill] : undefined);
  };

  const cards: { key: 'quick' | 'smart' | 'exam' | 'test'; title: string; subtitle: string; count: number }[] = [
    { key: 'quick', title: t('practice.quick_practice_title'), subtitle: t('practice.quick_practice_subtitle'), count: 5 },
    { key: 'smart', title: t('practice.smart_practice_title'), subtitle: t('practice.smart_practice_subtitle'), count: 10 },
    { key: 'exam', title: t('practice.exam_practice_title'), subtitle: t('practice.exam_practice_subtitle'), count: 15 },
    { key: 'test', title: t('practice.test_practice_title'), subtitle: t('practice.test_practice_subtitle'), count: 6 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B0F1A] text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('practice.hub_title')}</h1>
          <div className="w-10" />
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight text-white">🧩 {t('practice.hub_title')}</h2>
          <p className="text-[#9AA3B2] mt-2 text-sm">
            {selectedSkill ? `${t('practice.hub_subtitle_by_skill_prefix')} ${t(`dashboard.skill_${selectedSkill}`)}` : t('practice.hub_subtitle')}
          </p>
        </div>

        {weakSkillKeys && weakSkillKeys.length > 0 && onStartWeakPractice && (
          <button
            type="button"
            onClick={() => onStartWeakPractice(weakSkillKeys)}
            className="relative w-full text-left p-5 rounded-[28px] border transition-all duration-300 group overflow-hidden mb-4"
            style={{
              background: 'rgba(30, 40, 60, 0.7)',
              backdropFilter: 'blur(24px)',
              borderColor: 'rgba(251, 191, 36, 0.35)',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)',
            }}
          >
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <h3 className="text-base font-bold text-amber-200/90 mb-1">{t('dashboard.fixWeakAreas')}</h3>
            <p className="text-xs text-[#9AA3B2]">{t('practice.weak_practice_subtitle')}</p>
          </button>
        )}

        <div className="space-y-3">
          {cards.map(({ key, title, subtitle, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedMode(key)}
              className="relative w-full text-left p-5 rounded-[28px] border transition-all duration-300 group overflow-hidden"
              style={{
                background: 'rgba(15, 18, 30, 0.7)',
                backdropFilter: 'blur(24px)',
                borderColor: selectedMode === key ? 'rgba(91, 140, 255, 0.4)' : 'rgba(255,255,255,0.08)',
                boxShadow: selectedMode === key ? '0 0 24px rgba(91, 140, 255, 0.15)' : 'none',
              }}
            >
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#5B8CFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {key === 'exam' && !isPro && (
                <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  {t('practice.pro_tag')}
                </span>
              )}
              <h3 className="text-base font-bold text-[#E6E9F2] mb-1">{title}</h3>
              <p className="text-xs text-[#9AA3B2]">{subtitle}</p>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={startSelected}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #5B8CFF, #8A7CFF)',
              boxShadow: '0 8px 24px rgba(91, 140, 255, 0.35)',
            }}
          >
            {t('practice.start_practice_cta')}
          </button>
          {!isPro && (
            <p className="text-center text-[#9AA3B2] text-xs mt-3">
              {t('practice.limit_hint')}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default PracticeHubScreen;
