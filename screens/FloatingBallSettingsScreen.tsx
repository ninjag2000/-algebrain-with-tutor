import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface FloatingBallSettingsScreenProps {
  onBack: () => void;
}

const FloatingBallSettingsScreen: React.FC<FloatingBallSettingsScreenProps> = ({ onBack }) => {
  const { t } = useLocalization();

  const Step: React.FC<{ number: number; text: string; children?: React.ReactNode }> = ({ number, text, children }) => (
    <div className="mb-6">
      <div className="flex items-start mb-2">
        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold mr-3">{number}</div>
        <p className="font-semibold">{text}</p>
      </div>
      {children && <div className="ml-9 p-4 bg-gray-800 rounded-lg">{children}</div>}
    </div>
  );

  const ScreenshotPlaceholder: React.FC<{ content: string, highlight?: string }> = ({ content, highlight }) => (
      <div className="bg-gray-700 rounded-lg p-4 my-2 text-sm">
          <p className="text-gray-400 mb-2">Settings</p>
          <div className="space-y-2">
              <p>...</p>
              {highlight ? (
                <p className="bg-blue-500/30 border border-blue-500 rounded p-2 text-white">{highlight}</p>
              ) : null}
              <p>{content}</p>
              <p>...</p>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back to floating ball screen" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('floatingBall.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">{t('floatingBall.settingsTitle')}</h2>
          <p className="text-sm text-gray-400 mt-2">{t('floatingBall.settingsInstruction')} <button onClick={onBack} className="text-blue-400 hover:underline">{t('floatingBall.clickToSettings')}</button></p>
        </div>

        <div>
          <Step number={1} text={t('floatingBall.step1')}>
             <ScreenshotPlaceholder content="General management" highlight="Apps" />
          </Step>
          <Step number={2} text={t('floatingBall.step2')}>
              <ScreenshotPlaceholder content="Photos" highlight="AlgeBrain" />
          </Step>
          <Step number={3} text={t('floatingBall.step3')}>
            <ScreenshotPlaceholder content="App details in store" highlight="Appear on top" />
          </Step>
          <Step number={4} text={t('floatingBall.step4')}>
            <ScreenshotPlaceholder content="Storage" highlight="Battery" />
          </Step>
          <Step number={5} text={t('floatingBall.step5')}>
             <ScreenshotPlaceholder content="Optimized" highlight="Unrestricted" />
          </Step>
        </div>
      </main>
    </div>
  );
};

export default FloatingBallSettingsScreen;