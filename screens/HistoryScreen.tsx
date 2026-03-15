import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { HistoryItem } from '../types';

interface HistoryScreenProps {
  onBack: () => void;
  history: HistoryItem[];
  onViewHistoryItem: (item: HistoryItem) => void;
  onNavigateToScan: () => void;
}

const formatDate = (timestamp: number, locale: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
  
  const isYesterday = date.getDate() === yesterday.getDate() &&
                      date.getMonth() === yesterday.getMonth() &&
                      date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack, history, onViewHistoryItem, onNavigateToScan }) => {
  const { t, language } = useLocalization();

  return (
    <div className="flex flex-col h-full bg-[#0F1115] text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('history.title')}</h1>
          <div className="w-10 flex-shrink-0"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center h-full p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-700 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-2xl font-black mb-2">{t('history.emptyTitle')}</h2>
            <p className="text-gray-400 mb-8 max-w-xs">{t('history.emptySubtitle')}</p>
            <button 
              onClick={onNavigateToScan}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              {t('history.solveFirst')}
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {history.map(item => (
              <button 
                key={item.id} 
                onClick={() => onViewHistoryItem(item)}
                className="w-full text-left bg-[#1A1D24] p-4 rounded-2xl flex items-center space-x-4 border border-white/5 shadow-md active:scale-[0.99] active:bg-white/5 transition-all"
              >
                {item.image ? (
                  <img src={item.image} alt="Problem thumbnail" className="w-16 h-16 rounded-lg object-cover bg-gray-700 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[#0F1115] flex items-center justify-center flex-shrink-0 border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h3m-3-10h.01M9 17h.01M9 14h.01M12 7h.01M12 10h.01M12 14h.01M15 7h.01M15 10h.01M15 14h.01M18 14h.01M18 17h.01M6 14h.01M6 17h.01M6 10h.01M6 7h.01" /></svg>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-sm text-gray-100 truncate">{item.problem}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(item.timestamp, language)}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryScreen;