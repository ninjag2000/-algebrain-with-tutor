
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import BrainIcon from '../../components/icons/BrainIcon';

interface AssessmentAnalysisScreenProps {
  onFinish: () => void;
  onBack?: () => void;
}

const AssessmentAnalysisScreen: React.FC<AssessmentAnalysisScreenProps> = ({ onFinish, onBack }) => {
  const { t } = useLocalization();
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const analysisTexts = [
    t('assessment.analysis_text1'),
    t('assessment.analysis_text2'),
    t('assessment.analysis_text3'),
  ];

  useEffect(() => {
    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1));
    }, 1500);

    const finishTimeout = setTimeout(() => {
      onFinish();
    }, 4500);

    return () => {
      clearInterval(textInterval);
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white p-8 justify-center items-center text-center relative overflow-hidden">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <div className="w-10">
            {onBack && (
              <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
          </div>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('assessment.scan_title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>
      <style>{`
        @keyframes brain-scan {
            0% { transform: translateY(-100%) scaleY(2); opacity: 0; }
            50% { opacity: 0.3; }
            100% { transform: translateY(100%) scaleY(2); opacity: 0; }
        }
        .animate-brain-scan { animation: brain-scan 2s ease-in-out infinite; }
      `}</style>
      <div className="relative w-48 h-48 mb-12">
        <BrainIcon className="w-full h-full text-[#5B8CFF] opacity-10" />
        <div className="absolute inset-0 flex items-center justify-center">
            <TutorAvatarIcon className="w-24 h-24 animate-pulse" />
        </div>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#5B8CFF] to-transparent animate-brain-scan" style={{ filter: 'blur(10px)' }}></div>
      </div>
      
      <h1 className="text-2xl font-bold tracking-tight text-gray-300 mb-6">{t('assessment.analysis_title')}</h1>

      <div className="h-16">
        {analysisTexts.map((text, index) => (
          <p
            key={index}
            className={`text-lg text-gray-500 transition-all duration-500 absolute left-0 right-0 px-8 ${
              index === currentTextIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `translateY(${ (index - currentTextIndex) * 30 }px)` }}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default AssessmentAnalysisScreen;
