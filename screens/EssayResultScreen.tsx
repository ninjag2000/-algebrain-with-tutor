
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocalization } from '../contexts/LocalizationContext';
import CopyIcon from '../components/icons/CopyIcon';

interface EssayResultScreenProps {
  topic: string;
  mode: string;
  result: string;
  onBack: () => void;
}

const EssayResultScreen: React.FC<EssayResultScreenProps> = ({ topic, mode, result, onBack }) => {
  const { t } = useLocalization();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label={t('essay.backToWriter')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('essay.resultTitle')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <section aria-labelledby="topic-heading" className="mb-6">
          <h2 id="topic-heading" className="text-lg font-semibold text-gray-400 mb-2">{t('summarizer.originalText')}:</h2>
          <div className="bg-gray-800 rounded-lg p-4 text-lg max-h-48 overflow-y-auto">
            {topic}
          </div>
        </section>

        <section aria-labelledby="essay-type-heading" className="mb-6">
          <h2 id="essay-type-heading" className="text-lg font-semibold text-gray-400 mb-2">{t('essay.resultMode')}:</h2>
          <div className="bg-gray-800 rounded-lg p-4 text-lg">
            {mode}
          </div>
        </section>

        <section aria-labelledby="essay-heading" className="relative">
          <div className="flex justify-between items-center mb-2">
            <h2 id="essay-heading" className="text-lg font-semibold text-blue-400">{t('essay.generatedEssay')}</h2>
            <div className="flex items-center space-x-2">
              {isCopied && <span className="text-xs text-green-400 animate-pulse">{t('translator.copied')}</span>}
              <button
                onClick={handleCopy}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all active:scale-95 shadow-md"
                aria-label="Copy result"
              >
                <CopyIcon className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-base">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EssayResultScreen;
