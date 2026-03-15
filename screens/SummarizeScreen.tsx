import React, { useState } from 'react';
import { getBookSummary } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';

interface SummarizeScreenProps {
  onBack: () => void;
  onSummarizeComplete: (title: string, analysisType: string, result: string) => void;
}

const ChipButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#5B8CFF] text-white shadow-md' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}>
      {label}
    </button>
);

const SummarizeScreen: React.FC<SummarizeScreenProps> = ({ onBack, onSummarizeComplete }) => {
  const { t, language: appLanguage } = useLocalization();
  
  const analysisTypes = {
    summary: t('summarize.summary'),
    plotAnalysis: t('summarize.plotAnalysis'),
    characterAnalysis: t('summarize.characterAnalysis'),
  };
  
  const languageOptions = [
    { key: 'en', value: t('translator.english') },
    { key: 'ru', value: t('translator.russian') },
    { key: 'es', value: t('translator.spanish') },
    { key: 'fr', value: t('translator.french') },
    { key: 'de', value: t('translator.german') },
    { key: 'zh', value: t('translator.chinese') },
    { key: 'other', value: t('translator.otherLanguage') },
  ];

  const [title, setTitle] = useState('');
  const [analysisType, setAnalysisType] = useState<string>(analysisTypes.summary);
  const [isLoading, setIsLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState(appLanguage);
  const [customOutputLanguage, setCustomOutputLanguage] = useState('');

  const handleGenerate = async () => {
    if (!title.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const finalLanguage = outputLanguage === 'other' ? customOutputLanguage : outputLanguage;
      const summaryResult = await getBookSummary(title, analysisType, finalLanguage);
      const translatedResult = summaryResult.startsWith('error.') ? t(summaryResult) : summaryResult;
      onSummarizeComplete(title, analysisType, translatedResult);
    } catch (error) {
      console.error("Summarize error:", error);
      onSummarizeComplete(title, analysisType, t('summarize.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const AnalysisButton: React.FC<{ type: string }> = ({ type }) => (
    <button
      onClick={() => setAnalysisType(type)}
      className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
        analysisType === type
          ? 'bg-gradient-to-r from-[#5B8CFF] to-[#7C9DFF] text-white shadow-lg'
          : 'bg-[rgba(18,24,38,0.7)] text-gray-300 hover:bg-white/10 border border-white/5'
      }`}
    >
      {type}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-white">
       {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
          <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#5B8CFF]"></div>
          <p className="mt-4 text-lg">{t('summarize.analyzing')}</p>
        </div>
      )}
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label={t('summarize.backToTools')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('summarize.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-6">
        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <label htmlFor="title-input" className="text-[#8A94A6] text-sm font-semibold mb-2 block">{t('summarize.bookOrMovie')}</label>
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('summarize.placeholder')}
            className="w-full bg-[rgba(18,24,38,0.7)] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/50 border border-white/10 transition-all shadow-inner text-base placeholder:text-[#8A94A6]"
          />
        </div>

        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4 animate-in fade-in duration-300 delay-100">
          <label className="text-[#8A94A6] text-sm font-semibold mb-2 block">{t('summarize.analysisType')}</label>
          <div className="flex flex-wrap gap-3">
            <AnalysisButton type={analysisTypes.summary} />
            <AnalysisButton type={analysisTypes.plotAnalysis} />
            <AnalysisButton type={analysisTypes.characterAnalysis} />
          </div>
        </div>

        <div className="bg-[rgba(18,24,38,0.6)] backdrop-blur-lg rounded-3xl p-6 space-y-3 border border-white/5 shadow-2xl animate-in fade-in duration-300 delay-200">
            <h3 className="text-[#A78BFA] text-xs font-black uppercase tracking-widest">{t('summarizer.advanced')}</h3>
            <div className="space-y-3">
                <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('summarizer.language')}</label>
                <div className="flex flex-wrap gap-2">
                    {languageOptions.map(opt => (<ChipButton key={opt.key} label={opt.value} isActive={outputLanguage === opt.key} onClick={() => setOutputLanguage(opt.key)} />))}
                </div>
                {outputLanguage === 'other' && (
                  <input
                    type="text"
                    value={customOutputLanguage}
                    onChange={(e) => setCustomOutputLanguage(e.target.value)}
                    placeholder={t('translator.customLanguagePlaceholder')}
                    className="w-full bg-[rgba(18,24,38,0.7)] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/50 text-sm animate-in slide-in-from-top-2 duration-200 mt-2"
                  />
                )}
            </div>
        </div>

        <div className="mt-auto pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <button 
                onClick={handleGenerate} 
                disabled={isLoading || !title.trim()} 
                className="w-full h-[60px] bg-gradient-to-r from-[#5B8CFF] to-[#7C9DFF] text-white font-semibold text-lg py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(91,140,255,0.35)] active:scale-[0.97]"
            >
              {isLoading ? t('summarize.analyzing') : t('summarize.analyze')}
            </button>
        </div>
      </main>
    </div>
  );
};

export default SummarizeScreen;