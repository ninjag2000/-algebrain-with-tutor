
import React from 'react';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import { useLocalization } from '../../contexts/LocalizationContext';

interface WelcomeScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext, onSkip }) => {
  const { t } = useLocalization();

  const floatingElements = [
    { content: '∫', class: 'top-1/4 left-1/4 text-3xl opacity-30 animate-float' },
    { content: '√x', class: 'top-1/3 right-1/4 text-2xl opacity-40 animate-float-delay-1' },
    { content: 'ax²+bx+c', class: 'bottom-1/3 left-1/4 text-xl opacity-20 animate-float-delay-2' },
    { content: '📈', class: 'bottom-1/4 right-1/4 text-4xl opacity-30 animate-float-delay-3' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0F1115] text-[#E6EAF2] p-8 overflow-hidden relative">
       <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay-1 { animation: float 7s ease-in-out infinite 1s; }
        .animate-float-delay-2 { animation: float 8s ease-in-out infinite 0.5s; }
        .animate-float-delay-3 { animation: float 5s ease-in-out infinite 1.5s; }
      `}</style>

      {/* Skip Button in Header */}
      <header className="absolute top-0 right-0 p-6 z-30 pointer-events-none pt-safe">
        <button 
          onClick={(e) => { e.stopPropagation(); onSkip(); }} 
          className="text-[#9AA3B2] text-sm font-medium px-4 py-2 rounded-full hover:bg-white/5 transition-colors active:scale-95 pointer-events-auto"
        >
          {t('onboarding.slides.skip_button')}
        </button>
      </header>

      {/* Background elements */}
      {floatingElements.map((el, i) => (
        <div key={i} className={`absolute font-mono text-[#3A8DFF] pointer-events-none ${el.class}`}>{el.content}</div>
      ))}

      <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10">
        <TutorAvatarIcon className="w-72 h-72 mb-6 animate-in fade-in zoom-in-95 duration-700" />
        <h1 className="text-5xl font-black tracking-tighter mb-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">Think Smarter. <br/>Not Harder.</h1>
        <p className="text-lg text-[#9AA3B2] max-w-xs animate-in fade-in slide-in-from-top-2 duration-700 delay-200">
          AI that solves math and explains every step.
        </p>
      </div>

      <div className="relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button 
            onClick={onNext} 
            className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#6C5CE7] text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:shadow-xl hover:shadow-blue-500/30 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
        >
          {t('onboarding.welcome.start_button')} →
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
