
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocalization } from '../contexts/LocalizationContext';
import CopyIcon from '../components/icons/CopyIcon';

interface SummarizeResultScreenProps {
  input: string;
  analysisType: string;
  result: string;
  onBack: () => void;
  backLabelKey: string;
}

const SummarizeResultScreen: React.FC<SummarizeResultScreenProps> = ({ input, analysisType, result, onBack, backLabelKey }) => {
  const { t } = useLocalization();
  const [isCopied, setIsCopied] = useState(false);

  const isTextTool = analysisType === t('summarizer.textSummarizer') || analysisType === t('summarizer.keywordExtractor');

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
          <button onClick={onBack} aria-label={t(backLabelKey)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('summarize.resultTitle')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
          {/* Header Info Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {isTextTool ? t('summarizer.originalText') : t('summarize.bookOrMovie')}
              </h2>
              <p className="text-2xl font-bold text-white leading-tight">{input}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
                {analysisType}
              </span>
            </div>
          </div>

          {/* Result Section */}
          <div className="relative bg-gray-800 p-6 md:p-10 rounded-3xl border border-gray-700 shadow-xl">
            <div className="absolute top-6 right-6 flex items-center space-x-2">
              {isCopied && <span className="text-xs text-green-400 animate-pulse">{t('translator.copied')}</span>}
              <button
                onClick={handleCopy}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all active:scale-95 shadow-lg group"
                aria-label="Copy result"
              >
                <CopyIcon className="w-5 h-5 text-gray-300 group-hover:text-white" />
              </button>
            </div>

            <h2 className="text-xl font-semibold text-blue-400 mb-8 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t('summarize.generatedSummary')}
            </h2>

            <div className="prose prose-invert prose-lg max-w-none 
              prose-headings:text-blue-300 prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
              prose-strong:text-white prose-strong:font-bold
              prose-li:text-gray-300 prose-li:mb-2
              prose-ul:my-6 prose-ol:my-6
              prose-blockquote:border-blue-500 prose-blockquote:bg-blue-900/10 prose-blockquote:py-2 prose-blockquote:rounded-r-lg">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SummarizeResultScreen;
