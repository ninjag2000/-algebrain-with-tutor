import React, { useState, useRef } from 'react';
import { translateText, checkGrammar } from '../services/geminiService';
import { TranslationResult } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import GalleryIcon from '../components/icons/GalleryIcon';
import ScanIcon from '../components/icons/ScanIcon';
import CopyIcon from '../components/icons/CopyIcon';

interface TranslatorScreenProps {
  onBack: () => void;
}

// FIX: Changed export of TranslatorScreen from default to named to resolve "Module has no default export" error.
export const TranslatorScreen: React.FC<TranslatorScreenProps> = ({ onBack }) => {
  const [mode, setMode] = useState<'translate' | 'grammar'>('translate');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ru');
  const [customSourceLang, setCustomSourceLang] = useState('');
  const [customTargetLang, setCustomTargetLang] = useState('');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; name: string; } | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocalization();

  const languages = [
    { code: 'auto', name: t('translator.detectLanguage') },
    { code: 'en', name: t('translator.english') },
    { code: 'ru', name: t('translator.russian') },
    { code: 'es', name: t('translator.spanish') },
    { code: 'fr', name: t('translator.french') },
    { code: 'de', name: t('translator.german') },
    { code: 'zh', name: t('translator.chinese') },
    { code: 'other', name: t('translator.otherLanguage') },
  ];

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string)?.split(',')[1];
            if (base64) {
                setAttachedImage({ base64, mimeType: file.type, name: file.name });
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
      setAttachedImage(null);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if ((!inputText.trim() && !attachedImage) || isLoading) return;
    setIsLoading(true);
    setOutputText(null);
    setIsCopied(false);
    try {
      const finalSource = sourceLang === 'other' ? customSourceLang : sourceLang;
      const finalTarget = targetLang === 'other' ? customTargetLang : targetLang;

      if (mode === 'translate') {
        const translatedResult = await translateText(inputText, finalSource, finalTarget, attachedImage);
        setOutputText(translatedResult.mainTranslation.startsWith('error.') ? { mainTranslation: t(translatedResult.mainTranslation) } : translatedResult);
      } else {
        const correctedText = await checkGrammar(inputText, finalSource, attachedImage);
        setOutputText({ mainTranslation: correctedText.startsWith('error.') ? t(correctedText) : correctedText });
      }
    } catch (error) {
      console.error("Submission error:", error);
      setOutputText({ mainTranslation: t(mode === 'translate' ? 'translator.error' : 'error.grammarCheckFail') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto' || !outputText) return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText.mainTranslation);
    setOutputText(null);
    setAttachedImage(null);
  };

  const handleCopy = () => {
    if (!outputText?.mainTranslation) return;
    navigator.clipboard.writeText(outputText.mainTranslation).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const ChipButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; ariaLabel?: string }> = ({ label, isActive, onClick, ariaLabel }) => (
    <button onClick={onClick} aria-label={ariaLabel || label} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#5B8CFF] text-white shadow-md' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label={t('translator.backToTools')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{mode === 'translate' ? t('translator.title') : t('translator.grammarCheck')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        <div className="flex justify-center">
            <div className="bg-[rgba(18,24,38,0.7)] p-1 rounded-2xl flex space-x-1 border border-white/5 shadow-lg">
                <button onClick={() => { setMode('translate'); setOutputText(null); }} aria-label={t('translator.title')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'translate' ? 'bg-[#5B8CFF] shadow-lg text-white' : 'text-[#8A94A6]'}`}>{t('translator.title')}</button>
                <button onClick={() => { setMode('grammar'); setOutputText(null); }} aria-label={t('translator.grammarCheck')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'grammar' ? 'bg-[#5B8CFF] shadow-lg text-white' : 'text-[#8A94A6]'}`}>{t('translator.grammarCheck')}</button>
            </div>
        </div>
        
        {mode === 'translate' ? (
          <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
            <div>
              <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider mb-2 block">From</label>
              <div className="flex flex-wrap gap-2">{languages.map(lang => (<ChipButton key={`src-${lang.code}`} label={lang.name} isActive={sourceLang === lang.code} onClick={() => setSourceLang(lang.code)}/>))}</div>
              {sourceLang === 'other' && <input type="text" value={customSourceLang} onChange={(e) => setCustomSourceLang(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} aria-label={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 text-sm"/>}
            </div>
            <div className="flex justify-center"><button onClick={handleSwapLanguages} disabled={sourceLang === 'auto' || !outputText} aria-label={t('translator.swapLanguages')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all border border-white/5"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#5B8CFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button></div>
            <div>
              <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider mb-2 block">To</label>
              <div className="flex flex-wrap gap-2">{languages.filter(l=>l.code !== 'auto').map(lang => (<ChipButton key={`tgt-${lang.code}`} label={lang.name} isActive={targetLang === lang.code} onClick={() => setTargetLang(lang.code)}/>))}</div>
              {targetLang === 'other' && <input type="text" value={customTargetLang} onChange={(e) => setCustomTargetLang(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} aria-label={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 text-sm"/>}
            </div>
          </div>
        ) : (
          <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
            <div>
              <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider mb-2 block">Language</label>
              <div className="flex flex-wrap gap-2">{languages.map(lang => (<ChipButton key={`grm-${lang.code}`} label={lang.name} isActive={sourceLang === lang.code} onClick={() => setSourceLang(lang.code)}/>))}</div>
              {sourceLang === 'other' && <input type="text" value={customSourceLang} onChange={(e) => setCustomSourceLang(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} aria-label={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 text-sm"/>}
            </div>
          </div>
        )}
        
        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-[28px] border border-white/5 shadow-2xl flex-1 flex flex-col group">
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t(mode === 'translate' ? 'translator.placeholder' : 'translator.grammarPlaceholder')} aria-label={t(mode === 'translate' ? 'translator.placeholder' : 'translator.grammarPlaceholder')} className="w-full h-full flex-1 bg-transparent p-0 resize-none focus:outline-none text-base text-white placeholder:text-[#8A94A6]" />
          {inputText && <button onClick={() => setInputText('')} aria-label={t('translator.clearInput')} className="absolute top-4 right-4 p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>}
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={() => galleryInputRef.current?.click()} aria-label={t('translator.chooseFromGallery')} className="flex-1 h-12 flex items-center justify-center space-x-2 bg-[rgba(18,24,38,0.7)] backdrop-blur-xl border border-white/5 rounded-xl hover:bg-white/5 transition-colors shadow-lg active:scale-95"><GalleryIcon className="h-5 w-5 text-[#5B8CFF]" /><span className="text-xs font-bold text-[#8A94A6] uppercase tracking-tight">{t('translator.chooseFromGallery')}</span></button>
          <button onClick={() => cameraInputRef.current?.click()} aria-label={t('translator.takePhoto')} className="flex-1 h-12 flex items-center justify-center space-x-2 bg-[rgba(18,24,38,0.7)] backdrop-blur-xl border border-white/5 rounded-xl hover:bg-white/5 transition-colors shadow-lg active:scale-95"><ScanIcon active={false} className="h-5 w-5 text-[#5B8CFF]" /><span className="text-xs font-bold text-[#8A94A6] uppercase tracking-tight">{t('translator.takePhoto')}</span></button>
        </div>
        <input type="file" ref={galleryInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
        <input type="file" ref={cameraInputRef} onChange={handleImageChange} className="hidden" accept="image/*" capture="environment" />
        {attachedImage && <div className="flex items-center justify-between bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 px-4 py-2.5 rounded-xl text-xs"><div className="flex items-center space-x-2 overflow-hidden"><span className="truncate text-[#5B8CFF] font-bold tracking-tight">{attachedImage.name}</span></div><button onClick={handleRemoveImage} aria-label={t('translator.removeImage')} className="ml-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">&times;</button></div>}

        <div className="relative bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-3xl min-h-[160px] border border-white/5 shadow-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-12 h-12 border-3 border-[#5B8CFF]/20 border-t-[#5B8CFF] rounded-full animate-spin"></div>
              <p className="mt-4 text-lg">{t(mode === 'translate' ? 'translator.translating' : 'translator.checkingGrammar')}</p>
            </div>
          ) : outputText ? (
            <div className="w-full h-full overflow-y-auto scrollbar-hide animate-in fade-in duration-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold text-[#5B8CFF] uppercase tracking-widest">{mode === 'translate' ? 'Result' : 'Corrected Text'}</h3>
                <div className="flex items-center space-x-2">
                  {isCopied && <span className="text-xs font-bold text-green-400">{t('translator.copied')}</span>}
                  <button onClick={handleCopy} aria-label={t('translator.copyResult')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"><CopyIcon className="w-4 h-4 text-gray-300" /></button>
                </div>
              </div>
              <p className="text-lg font-semibold mb-6 whitespace-pre-wrap leading-tight text-white">{outputText.mainTranslation}</p>
              {mode === 'translate' && outputText.alternatives?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">{t('translator.alternatives')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {outputText.alternatives.map((alt, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-gray-300 text-xs font-medium">{alt}</span>
                    ))}
                  </div>
                </div>
              )}
              {mode === 'translate' && outputText.definition && (
                <div className="mb-6">
                  <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">{t('translator.definition')}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{outputText.definition}</p>
                </div>
              )}
              {mode === 'translate' && outputText.detectedLanguage && (
                <div>
                  <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">{t('translator.detectedLanguage')}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{outputText.detectedLanguage}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg">{t('translator.resultPlaceholder')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};