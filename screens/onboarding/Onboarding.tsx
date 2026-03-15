import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import WelcomeScreen from './WelcomeScreen';
import FeatureSlide from './FeatureSlide';
import PersonalizationScreen from './PersonalizationScreen';
import { useLocalization } from '../../contexts/LocalizationContext';
import { PersonalizationData } from '../../types';

interface OnboardingProps {
  onComplete: (data: PersonalizationData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const { t } = useLocalization();

  const nextStep = () => setStep(prev => prev + 1);
  const skipToPersonalization = () => setStep(5);

  const slides = [
    {
      title: "Not Just Answers. Real Understanding.",
      subtitle: "Step-by-step explanations powered by AI logic.",
      mockupContent: (
        <div className="p-4 bg-gray-800 rounded-lg text-sm text-white space-y-2 animate-in fade-in duration-500">
            <p className="text-gray-400">Problem: 2x + 4 = 10</p>
            <div className="p-2 bg-blue-600/20 rounded border border-blue-500/30">
                <p className="font-bold">Step 1: Subtract 4</p>
                <p className="text-gray-300">2x = 10 - 4</p>
            </div>
             <div className="p-2 bg-gray-700/50 rounded opacity-60">
                <p className="font-bold">Step 2: Simplify</p>
                <p className="text-gray-400">2x = 6</p>
            </div>
            <div className="p-2 bg-gray-700/50 rounded opacity-40">
                <p className="font-bold">Solution</p>
                <p className="text-gray-400">x = 3</p>
            </div>
        </div>
      )
    },
    {
      title: "Scan. Solve. Understand.",
      subtitle: "Take a photo of any math problem — get instant solutions.",
      mockupContent: (
        <div className="relative w-full h-full min-h-[200px] bg-[#1a1d24] rounded-lg overflow-hidden">
          <img src="/math-problem-photo.png" alt="Math problem" className="w-full h-full object-cover" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_theme(colors.blue.400)] animate-scan-line"></div>
        </div>
      )
    },
    {
      title: "Built for School & Homework",
      subtitle: "Algebra, equations, graphs, word problems — all in one AI tutor.",
      mockupContent: (
        <div className="p-4 grid grid-cols-2 gap-3 text-white">
            <div className="p-3 bg-gray-800 rounded-lg border border-blue-500/30"><h4 className="font-bold text-sm">📊 Graphs</h4></div>
            <div className="p-3 bg-gray-800 rounded-lg border border-violet-500/30"><h4 className="font-bold text-sm">✏️ Algebra</h4></div>
            <div className="p-3 bg-gray-800 rounded-lg border border-violet-500/30"><h4 className="font-bold text-sm">📚 Homework</h4></div>
            <div className="p-3 bg-gray-800 rounded-lg border border-blue-500/30"><h4 className="font-bold text-sm">🤖 AI Tutor</h4></div>
        </div>
      )
    }
  ];

  const ProgressDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="flex justify-center space-x-2 my-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-6 bg-blue-500' : 'w-2 bg-gray-600'
          }`}
        />
      ))}
    </div>
  );

  switch (step) {
    case 0:
      return <SplashScreen onFinish={nextStep} />;
    case 1:
      return <WelcomeScreen onNext={nextStep} onSkip={skipToPersonalization} />;
    case 2:
    case 3:
    case 4:
      const slideIndex = step - 2;
      const slide = slides[slideIndex];
      return (
        <div className="h-full w-full bg-[#0F1115]">
          <style>{`
              @keyframes scan-line {
                0% { transform: translateY(-100px); }
                100% { transform: translateY(100px); }
              }
              .animate-scan-line { animation: scan-line 2s ease-in-out infinite alternate; }
          `}</style>
          <FeatureSlide title={slide.title} subtitle={slide.subtitle} onNext={nextStep} onSkip={skipToPersonalization}>
            <div className="flex-1 flex items-center justify-center p-4">
              {slide.mockupContent}
            </div>
            <ProgressDots current={slideIndex} total={slides.length} />
          </FeatureSlide>
        </div>
      );
    case 5:
        return <PersonalizationScreen onComplete={onComplete} />
    default:
      return null;
  }
};

export default Onboarding;