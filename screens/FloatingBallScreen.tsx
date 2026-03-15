import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface FloatingBallScreenProps {
  onBack: () => void;
  onNavigateToSettings: () => void;
  floatingBallEnabled: boolean;
  onFloatingBallEnabledChange: (enabled: boolean) => void;
  isPro?: boolean;
  onOpenPaywall?: () => void;
}

const GestureIcon: React.FC<{ type: 'single' | 'double' | 'long' }> = ({ type }) => {
  if (type === 'long') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.5 31.5C24.1569 31.5 25.5 30.1569 25.5 28.5C25.5 26.8431 24.1569 25.5 22.5 25.5C20.8431 25.5 19.5 26.8431 19.5 28.5C19.5 30.1569 20.8431 31.5 22.5 31.5Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22.5 18V28.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22.5 10.5V13.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.1475 13.8525L20.2725 15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.25 18.75H16.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28.5 18.75H30.75" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M25.8525 13.8525L24.7275 15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M29.25 39.75L33 43.5L39.75 36.75" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 31.5C24.1569 31.5 25.5 30.1569 25.5 28.5C25.5 26.8431 24.1569 25.5 22.5 25.5C20.8431 25.5 19.5 26.8431 19.5 28.5C19.5 30.1569 20.8431 31.5 22.5 31.5Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22.5 18V28.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {type === 'double' && <path d="M28.5 22.5V28.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
      <path d="M29.25 39.75L33 43.5L39.75 36.75" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const FloatingBallScreen: React.FC<FloatingBallScreenProps> = ({ onBack, onNavigateToSettings, floatingBallEnabled, onFloatingBallEnabledChange, isPro = false, onOpenPaywall }) => {
  const { t } = useLocalization();

  const handleToggle = () => {
    if (!floatingBallEnabled && !isPro && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    onFloatingBallEnabledChange(!floatingBallEnabled);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back to tools" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
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
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-white/5 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{t('floatingBall.enableSwitch')}</h2>
                {!isPro && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/50 px-1.5 py-0.5 rounded">Pro</span>}
              </div>
              <p className="text-xs text-gray-400 max-w-xs">{t('floatingBall.description')}</p>
            </div>
            <button onClick={handleToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${floatingBallEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}>
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${floatingBallEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center mb-6">
          <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center justify-center border border-white/5 shadow-md">
            <GestureIcon type="single" />
            <p className="text-xs mt-2">{t('floatingBall.singleClick')}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center justify-center border border-white/5 shadow-md">
            <GestureIcon type="double" />
            <p className="text-xs mt-2">{t('floatingBall.doubleClick')}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center justify-center border border-white/5 shadow-md">
            <GestureIcon type="long" />
            <p className="text-xs mt-2">{t('floatingBall.longPress')}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-white/5 shadow-lg">
            <h3 className="font-semibold mb-4">{t('floatingBall.instantAnswers')}</h3>
            <div className="aspect-w-9 aspect-h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Phone Mockup</p>
            </div>
        </div>
        
        <div className="mt-6 text-xs text-gray-400 space-y-4">
            <p>{t('floatingBall.xiaomiVivoNote')}</p>
            <p>{t('floatingBall.oppoNote')}</p>
            <button onClick={onNavigateToSettings} className="text-blue-400 hover:underline">{t('floatingBall.clickToSettings')}</button>
        </div>
      </main>
    </div>
  );
};

export default FloatingBallScreen;