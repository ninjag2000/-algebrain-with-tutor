import React, { useState, useRef, useEffect } from 'react';
import { refineText } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import ImproveIcon from '../components/icons/ImproveIcon';
import RephraseIcon from '../components/icons/RephraseIcon';
import SimplifyIcon from '../components/icons/SimplifyIcon';
import ContinueWritingIcon from '../components/icons/ContinueWritingIcon';
import ShortenIcon from '../components/icons/ShortenIcon';
import ExpandIcon from '../components/icons/ExpandIcon';
import ScanIcon from '../components/icons/ScanIcon';
import BrainIcon from '../components/icons/BrainIcon';

interface EssayHelperScreenProps {
  onBack: () => void;
  onHelperComplete: (topic: string, mode: string, result: string) => void;
}

type EssayMode = 'improve' | 'rephrase' | 'simplify' | 'continue' | 'shorten' | 'expand';

const ChipButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#5B8CFF] text-white shadow-md' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}>
      {label}
    </button>
);

// FIX: Added 'export' keyword to the EssayHelperScreen component.
export const EssayHelperScreen: React.FC<EssayHelperScreenProps> = ({ onBack, onHelperComplete }) => {
  const { t, language: appLanguage } = useLocalization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<EssayMode>('improve');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);

  const styles = [{ key: 'explanatory', value: t('essayHelper.style_explanatory') }, { key: 'creative', value: t('essayHelper.style_creative') }, { key: 'persuasive', value: t('essayHelper.style_persuasive') }, { key: 'narrative', value: t('essayHelper.style_narrative') }, { key: 'descriptive', value: t('essayHelper.style_descriptive') }, { key: 'other', value: t('essayHelper.style_other') }];
  const tones = [{ key: 'scientific', value: t('essayHelper.tone_scientific') }, { key: 'business', value: t('essayHelper.tone_business') }, { key: 'friendly', value: t('essayHelper.tone_friendly') }, { key: 'curious', value: t('essayHelper.tone_curious') }, { key: 'other', value: t('essayHelper.tone_other') }];
  const audiences = [{ key: 'children', value: t('essayHelper.audience_children') }, { key: 'teenagers', value: t('essayHelper.audience_teenagers') }, { key: 'youth', value: t('essayHelper.audience_youth') }, { key: 'researchers', value: t('essayHelper.audience_researchers') }, { key: 'specialists', value: t('essayHelper.audience_specialists') }, { key: 'other', value: t('essayHelper.audience_other') }];
  const languageOptions = [{ key: 'en', value: t('translator.english') }, { key: 'ru', value: t('translator.russian') }, { key: 'es', value: t('translator.spanish') }, { key: 'fr', value: t('translator.french') }, { key: 'de', value: t('translator.german') }, { key: 'zh', value: t('translator.chinese') }, { key: 'other', value: t('translator.otherLanguage') }];

  const [style, setStyle] = useState(styles[0].value);
  const [tone, setTone] = useState(tones[0].value);
  const [audience, setAudience] = useState(audiences[0].value);
  const [outputLanguage, setOutputLanguage] = useState(appLanguage);

  const [customStyle, setCustomStyle] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [customAudience, setCustomAudience] = useState('');
  const [customOutputLanguage, setCustomOutputLanguage] = useState('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  };
  
  const handleRemoveFile = () => {
    setFileContent(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string)?.split(',')[1];
            if (base64) {
                setImage({ base64, mimeType: file.type, name: file.name });
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if ((!inputText.trim() && !fileContent && !image) || isLoading) return;
    setIsLoading(true);
    try {
      let fullText = inputText;
      if (fileContent) fullText += `\n\n${fileContent}`;

      let options: any = {
        style: style === t('essayHelper.style_other') ? customStyle : style,
        tone: tone === t('essayHelper.tone_other') ? customTone : tone,
        audience: audience === t('essayHelper.audience_other') ? customAudience : audience,
        outputLanguage: outputLanguage === 'other' ? customOutputLanguage : outputLanguage,
      };
      if (image) {
        options.image = { base64: image.base64, mimeType: image.mimeType };
      }

      const result = await refineText(fullText, activeTab, outputLanguage, options);
      const translatedResult = result.startsWith('error.') ? t(result) : result;
      onHelperComplete(inputText, activeTab, translatedResult);
    } catch (error) {
      console.error("Essay Helper error:", error);
      onHelperComplete(inputText, activeTab, t('essayHelper.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const TabButton: React.FC<{ mode: EssayMode; icon: React.ReactNode; label: string }> = ({ mode, icon, label }) => (
    <button
      onClick={() => setActiveTab(mode)}
      className={`relative flex items-center space-x-2 py-3 px-3 rounded-lg text-sm transition-all duration-300 justify-center flex-shrink-0 ${
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
      {isLoading && <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-50"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#5B8CFF]"></div><p className="mt-4 font-bold">{t('essayHelper.creating')}</p></div>}
      
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('essayHelper.title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <nav className="mt-1 flex items-center px-1 bg-transparent overflow-x-auto scrollbar-hide space-x-1">
          <TabButton mode="improve" label={t('essayHelper.improve')} icon={<ImproveIcon className="w-5 h-5"/>} />
          <TabButton mode="rephrase" label={t('essayHelper.rephrase')} icon={<RephraseIcon className="w-5 h-5"/>} />
          <TabButton mode="simplify" label={t('essayHelper.simplify')} icon={<SimplifyIcon className="w-5 h-5"/>} />
          <TabButton mode="continue" label={t('essayHelper.continueWriting')} icon={<ContinueWritingIcon className="w-5 h-5"/>} />
          <TabButton mode="shorten" label={t('essayHelper.shorten')} icon={<ShortenIcon className="w-5 h-5"/>} />
          <TabButton mode="expand" label={t('essayHelper.expand')} icon={<ExpandIcon className="w-5 h-5"/>} />
      </nav>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
          <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-[28px] border border-white/5 shadow-2xl space-y-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(91,140,255,0.08)] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="flex items-center space-x-2 text-[#A78BFA]"><BrainIcon className="w-5 h-5" /><h3 className="font-semibold text-sm">Algor AI Assistant</h3></div>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t('essayHelper.placeholder')} maxLength={10000} className="w-full h-36 bg-transparent rounded-2xl p-0 resize-none focus:outline-none text-base text-white placeholder:text-[#8A94A6]" />
            {inputText && <button onClick={() => setInputText('')} aria-label={t('translator.clearInput')} className="absolute top-4 right-4 p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 opacity-0 group-focus-within:opacity-100 transition-opacity">&times;</button>}
          </div>
          
          {/* File & Image attachments */}
          <div className="flex items-center space-x-3">
            <button onClick={() => fileInputRef.current?.click()} aria-label={t('summarizer.addFile')} className="flex-1 h-12 flex items-center justify-center space-x-2 bg-[rgba(18,24,38,0.7)] backdrop-blur-xl border border-white/5 rounded-xl hover:bg-white/5 transition-colors shadow-lg active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#5B8CFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-tight">{t('summarizer.addFile')}</span>
            </button>
            <button onClick={() => imageInputRef.current?.click()} aria-label={t('translator.takePhoto')} className="flex-1 h-12 flex items-center justify-center space-x-2 bg-[rgba(18,24,38,0.7)] backdrop-blur-xl border border-white/5 rounded-xl hover:bg-white/5 transition-colors shadow-lg active:scale-95">
              <ScanIcon active={false} className="h-5 w-5 text-[#5B8CFF]" />
              <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-tight">{t('translator.takePhoto')}</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md" />
          <input type="file" ref={imageInputRef} onChange={handleImageChange} className="hidden" accept="image/*" capture="environment" />

          {fileName && (
              <div className="flex items-center justify-between bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 px-4 py-2.5 rounded-xl text-xs">
                  <div className="flex items-center space-x-2 overflow-hidden">
                      <span className="truncate text-[#5B8CFF] font-bold tracking-tight">{fileName}</span>
                  </div>
                  <button onClick={handleRemoveFile} aria-label={t('translator.removeImage')} className="ml-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">&times;</button>
              </div>
          )}
          {image && (
              <div className="flex items-center justify-between bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-4 py-2.5 rounded-xl text-xs">
                  <div className="flex items-center space-x-2 overflow-hidden">
                      <span className="truncate text-[#A78BFA] font-bold tracking-tight">{image.name}</span>
                  </div>
                  <button onClick={handleRemoveImage} aria-label={t('translator.removeImage')} className="ml-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">&times;</button>
              </div>
          )}

          {/* Advanced Options */}
          <div className="bg-[rgba(18,24,38,0.6)] backdrop-blur-lg rounded-3xl p-5 border border-white/5 shadow-2xl space-y-6">
              <h3 className="text-[#A78BFA] text-xs font-black uppercase tracking-widest">{t('essayHelper.advanced')}</h3>
              
              <div className="space-y-3">
                  <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essayHelper.style')}</label>
                  <div className="flex flex-wrap gap-2">
                      {styles.map(s => (<ChipButton key={s.key} label={s.value} isActive={style === s.value} onClick={() => setStyle(s.value)}/>))}
                  </div>
                  {style === t('essayHelper.style_other') && <input type="text" value={customStyle} onChange={(e) => setCustomStyle(e.target.value)} placeholder={t('essayHelper.customStylePlaceholder')} aria-label={t('essayHelper.customStylePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
              </div>

              <div className="space-y-3">
                  <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essayHelper.tone')}</label>
                  <div className="flex flex-wrap gap-2">
                      {tones.map(t => (<ChipButton key={t.key} label={t.value} isActive={tone === t.value} onClick={() => setTone(t.value)}/>))}
                  </div>
                  {tone === t('essayHelper.tone_other') && <input type="text" value={customTone} onChange={(e) => setCustomTone(e.target.value)} placeholder={t('essayHelper.customTonePlaceholder')} aria-label={t('essayHelper.customTonePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
              </div>

              <div className="space-y-3">
                  <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essayHelper.audience')}</label>
                  <div className="flex flex-wrap gap-2">
                      {audiences.map(a => (<ChipButton key={a.key} label={a.value} isActive={audience === a.value} onClick={() => setAudience(a.value)}/>))}
                  </div>
                  {audience === t('essayHelper.audience_other') && <input type="text" value={customAudience} onChange={(e) => setCustomAudience(e.target.value)} placeholder={t('essayHelper.customAudiencePlaceholder')} aria-label={t('essayHelper.customAudiencePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
              </div>

              <div className="space-y-3">
                  <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essayHelper.language')}</label>
                  <div className="flex flex-wrap gap-2">
                      {languageOptions.map(opt => (<ChipButton key={opt.key} label={opt.value} isActive={outputLanguage === opt.key} onClick={() => setOutputLanguage(opt.key)} />))}
                  </div>
                  {outputLanguage === 'other' && <input type="text" value={customOutputLanguage} onChange={(e) => setCustomOutputLanguage(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} aria-label={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
              </div>
          </div>

          <div className="pt-8" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <button onClick={handleCreate} disabled={isLoading || (!inputText.trim() && !fileContent && !image)} className="w-full h-[60px] bg-gradient-to-r from-[#5B8CFF] to-[#7C9DFF] text-white font-semibold text-lg py-4 px-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(91,140,255,0.35)] disabled:opacity-50 active:scale-[0.97]">
              {isLoading ? t('essayHelper.creating') : t('essayHelper.create')}
            </button>
          </div>
      </main>
    </div>
  );
};