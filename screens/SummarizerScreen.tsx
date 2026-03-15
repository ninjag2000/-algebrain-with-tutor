import React, { useState, useRef } from 'react';
import { analyzeText, summarizeWebSource } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import TextSummarizerIcon from '../components/icons/TextSummarizerIcon';
import KeywordExtractorIcon from '../components/icons/KeywordExtractorIcon';
import WebIcon from '../components/icons/WebIcon';

interface SummarizerScreenProps {
  onBack: () => void;
  onSummarizerComplete: (input: string, analysisType: string, result: string) => void;
}

type SummarizeMode = 'text' | 'keywords' | 'web';

const ChipButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#5B8CFF] text-white shadow-md' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}>
      {label}
    </button>
);

const SummarizerScreen: React.FC<SummarizerScreenProps> = ({ onBack, onSummarizerComplete }) => {
  const { t, language } = useLocalization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<SummarizeMode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState(language);
  const [customOutputLanguage, setCustomOutputLanguage] = useState('');

  const languageOptions = [
    { key: 'en', value: t('translator.english') },
    { key: 'ru', value: t('translator.russian') },
    { key: 'es', value: t('translator.spanish') },
    { key: 'fr', value: t('translator.french') },
    { key: 'de', value: t('translator.german') },
    { key: 'zh', value: t('translator.chinese') },
    { key: 'other', value: t('translator.otherLanguage') },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const handleRemoveFile = () => { /* ... */ };
  const handleCreate = async () => { /* ... */ };

  const TabButton: React.FC<{ mode: SummarizeMode; icon: React.ReactNode; label: string }> = ({ mode, icon, label }) => (
    <button
      onClick={() => setActiveTab(mode)}
      className={`relative flex items-center space-x-2 py-3 px-4 rounded-lg text-sm transition-all duration-300 justify-center flex-shrink-0 ${
        activeTab === mode ? 'text-white' : 'text-[#7C8599] hover:bg-[rgba(18,24,38,0.7)]'
      }`}
    >
      <span className={activeTab === mode ? 'text-[#5B8CFF]' : 'opacity-60'}>{icon}</span>
      <span className="font-semibold">{label}</span>
      {activeTab === mode && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] shadow-[0_0_8px_0_#5B8CFF]"></div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-white">
       {isLoading && <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-50"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#5B8CFF]"></div><p className="mt-4 font-bold">{t('summarizer.creating')}</p></div>}
       
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('summarizer.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>
      
      <nav className="mt-1 flex items-center px-2 bg-transparent overflow-x-auto scrollbar-hide space-x-1">
          <TabButton mode="text" label={t('summarizer.textSummarizer')} icon={<TextSummarizerIcon className="w-5 h-5"/>} />
          <TabButton mode="web" label={t('summarizer.webSummarizer')} icon={<WebIcon className="w-5 h-5"/>} />
          <TabButton mode="keywords" label={t('summarizer.keywordExtractor')} icon={<KeywordExtractorIcon className="w-5 h-5"/>} />
      </nav>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-[28px] border border-white/5 shadow-2xl flex-1 flex flex-col">
            <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider mb-2 block">{activeTab === 'web' ? t('summarizer.urlLabel') : t('summarizer.textLabel')}</label>
            {activeTab === 'web' ? (
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('summarizer.urlPlaceholder')} className="w-full bg-transparent p-2 focus:outline-none text-base text-white placeholder:text-[#8A94A6]" />
            ) : (
                <div className="relative flex-1 flex flex-col">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('summarizer.textPlaceholder')} maxLength={10000} className="w-full flex-1 bg-transparent p-2 resize-none focus:outline-none text-base text-white placeholder:text-[#8A94A6]" />
                    <span className="absolute bottom-1 right-2 text-xs text-gray-500">{text.length}/10000</span>
                </div>
            )}
        </div>
          
        {activeTab === 'text' && ( fileName ? (<div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl text-sm"><span className="truncate mr-2">{fileName}</span><button onClick={handleRemoveFile}>&times;</button></div>) : (<button onClick={() => fileInputRef.current?.click()} className="w-full h-14 bg-[rgba(18,24,38,0.7)] backdrop-blur-xl hover:bg-white/5 text-gray-300 py-3 px-4 rounded-2xl transition-colors flex items-center justify-center text-sm border border-white/5 font-semibold shadow-md active:scale-95">{t('summarizer.addFile')}</button>) )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md" />

        <div className="bg-[rgba(18,24,38,0.6)] backdrop-blur-lg rounded-3xl p-5 border border-white/5 shadow-2xl space-y-3">
            <h3 className="text-[#A78BFA] text-xs font-black uppercase tracking-widest">{t('summarizer.advanced')}</h3>
            <div className="space-y-3">
                <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('summarizer.language')}</label>
                <div className="flex flex-wrap gap-2">
                    {languageOptions.map(opt => (<ChipButton key={opt.key} label={opt.value} isActive={outputLanguage === opt.key} onClick={() => setOutputLanguage(opt.key)} />))}
                </div>
                {outputLanguage === 'other' && <input type="text" value={customOutputLanguage} onChange={(e) => setCustomOutputLanguage(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 text-sm"/>}
            </div>
        </div>

        <div className="mt-auto pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <button onClick={handleCreate} disabled={isLoading} className="w-full h-[60px] bg-gradient-to-r from-[#5B8CFF] to-[#7C9DFF] text-white font-semibold text-lg py-4 px-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(91,140,255,0.35)] disabled:opacity-50 active:scale-[0.97]">
              {isLoading ? t('summarizer.creating') : t('summarizer.create')}
            </button>
        </div>
      </main>
    </div>
  );
};

export default SummarizerScreen;