
import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';

interface FeatureSlideProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  onSkip: () => void;
}

const FeatureSlide: React.FC<FeatureSlideProps> = ({ title, subtitle, children, onNext, onSkip }) => {
  const { t } = useLocalization();
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0F1115] text-[#E6EAF2] p-6 overflow-hidden relative">
      <header className="flex justify-end z-30 pointer-events-none pt-safe">
          <button 
            onClick={(e) => { e.stopPropagation(); onSkip(); }} 
            className="text-[#9AA3B2] text-sm px-4 py-2 rounded-full hover:bg-white/5 transition-colors pointer-events-auto"
          >
            {t('onboarding.slides.skip_button')}
          </button>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center -mt-10 relative z-10">
        <div className="w-full max-w-xs h-[55vh] bg-[#1A1D24] border-2 border-slate-700/50 rounded-[2.5rem] p-2 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-black w-24 h-5 rounded-full mx-auto mb-2 flex-shrink-0"></div>
          <div className="flex-1 rounded-2xl overflow-hidden bg-[#0F1115] flex flex-col">
            {children}
          </div>
        </div>
      </div>

      <div className="text-center relative z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <h2 className="text-2xl font-bold mb-2 max-w-sm mx-auto">{title}</h2>
        <p className="text-base text-gray-400 mb-6 max-w-sm mx-auto">{subtitle}</p>
        <button onClick={onNext} className="w-full bg-[#3A8DFF] hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-lg transition-colors mb-3 active:scale-95 shadow-lg shadow-blue-500/20">
          {t('onboarding.slides.continue_button')}
        </button>
      </div>
    </div>
  );
};

export default FeatureSlide;
