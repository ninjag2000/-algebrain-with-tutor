
import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';

interface AssessmentStartScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

const AssessmentStartScreen: React.FC<AssessmentStartScreenProps> = ({ onStart, onSkip }) => {
  const { t } = useLocalization();

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white p-8 justify-between relative overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex items-center justify-between">
        <button onClick={onSkip} aria-label={t('assessment.start_skip')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onSkip} className="text-gray-500 font-semibold text-sm hover:text-white transition-colors">
          {t('assessment.start_skip')}
        </button>
      </header>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="relative w-48 h-48 mb-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#5B8CFF]/30 to-[#A78BFA]/30 rounded-full blur-2xl animate-glow-ring-pulse"></div>
            <TutorAvatarIcon className="w-full h-full animate-float"/>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-white mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">{t('assessment.start_title')}</h1>
        <p className="text-lg text-gray-400 max-w-xs whitespace-pre-line animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">{t('assessment.start_subtitle')}</p>
      </div>

      <div className="pb-safe animate-in fade-in slide-in-from-bottom-8 duration-500 delay-300">
        <button 
          onClick={onStart} 
          className="w-full bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white font-bold py-5 rounded-2xl text-lg shadow-[0_10px_30px_rgba(91,140,255,0.3)] active:scale-95 transition-transform animate-pulse-glow"
        >
          {t('assessment.start_cta')}
        </button>
      </div>
    </div>
  );
};

export default AssessmentStartScreen;
