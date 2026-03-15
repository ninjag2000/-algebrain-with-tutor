import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToLanguage?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onNavigateToLanguage }) => {
  const { language, t } = useLocalization();

  const languageNames: Record<string, string> = { ru: t('languages.ru'), en: t('languages.en'), es: t('languages.es') };
  const currentLanguageName = languageNames[language] ?? language;

  return (
    <div className="flex flex-col h-full bg-[#0F1115] text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back to profile" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('settings.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-[#1A1D24] rounded-2xl overflow-hidden border border-white/5">
          {onNavigateToLanguage && (
            <button
              onClick={onNavigateToLanguage}
              className="flex items-center w-full p-4 hover:bg-white/5 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#5B8CFF] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2a2 2 0 002-2v-3a2 2 0 012-2h3.945M8 16v.01M12 16v.01M16 16v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-4 font-medium text-sm text-white/90">{t('settings.language')}</span>
              <span className="ml-auto text-sm text-gray-400">{currentLanguageName}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default SettingsScreen;