
import React, { useState, useRef } from 'react';
import { writeEssay } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import ScanIcon from '../components/icons/ScanIcon';
import BrainIcon from '../components/icons/BrainIcon';

interface EssayWriterScreenProps {
  onBack: () => void;
  onEssayComplete: (topic: string, mode: string, result: string) => void;
}

type WritingMode = 'essay' | 'poem' | 'blog' | 'script';

const EssayWriterScreen: React.FC<EssayWriterScreenProps> = ({ onBack, onEssayComplete }) => {
  const { t, language: appLanguage } = useLocalization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<WritingMode>('essay');
  const [isLoading, setIsLoading] = useState(false);

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);

  const [subMode, setSubMode] = useState<string | null>(null);
  const [poemForm, setPoemForm] = useState('');
  const [poemFeeling, setPoemFeeling] = useState('');
  const [languageLevel, setLanguageLevel] = useState('');
  const [tone, setTone] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [outputLanguage, setOutputLanguage] = useState(appLanguage);

  const [customEssayType, setCustomEssayType] = useState('');
  const [customPoemForm, setCustomPoemForm] = useState('');
  const [customPoemFeeling, setCustomPoemFeeling] = useState('');
  const [customLanguageLevel, setCustomLanguageLevel] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [customTargetAudience, setCustomTargetAudience] = useState('');
  const [customOutputLanguage, setCustomOutputLanguage] = useState('');
  
  const essayTypes = [
    { key: 'explanatory', label: t('essay.essayType_explanatory') },
    { key: 'creative', label: t('essay.essayType_creative') },
    { key: 'persuasive', label: t('essay.essayType_persuasive') },
    { key: 'narrative', label: t('essay.essayType_narrative') },
    { key: 'descriptive', label: t('essay.essayType_descriptive') },
    { key: 'other', label: t('essay.essayType_other') },
  ];

  const poemForms = [
    { key: 'sonnet', label: t('essay.form_sonnet') }, { key: 'haiku', label: t('essay.form_haiku') },
    { key: 'epic', label: t('essay.form_epic') }, { key: 'villanelle', label: t('essay.form_villanelle') },
    { key: 'limerick', label: t('essay.form_limerick') }, { key: 'other', label: t('essay.other') },
  ];

  const poemFeelings = [
    { key: 'love', label: t('essay.feeling_love') }, { key: 'joy', label: t('essay.feeling_joy') },
    { key: 'hope', label: t('essay.feeling_hope') }, { key: 'sadness', label: t('essay.feeling_sadness') },
    { key: 'fear', label: t('essay.feeling_fear') }, { key: 'other', label: t('essay.other') },
  ];

  const languageLevels = [
    { key: 'basic', label: t('essay.level_basic') }, { key: 'intermediate', label: t('essay.level_intermediate') },
    { key: 'advanced', label: t('essay.level_advanced') }, { key: 'other', label: t('essay.other') },
  ];

  const tones = [
      { key: 'scientific', label: t('essayHelper.tone_scientific') }, { key: 'business', label: t('essayHelper.tone_business') },
      { key: 'friendly', label: t('essayHelper.tone_friendly') }, { key: 'curious', label: t('essayHelper.tone_curious') },
      { key: 'other', label: t('essayHelper.tone_other') },
  ];
  
  const audiences = [
      { key: 'children', label: t('essay.audience_children') }, { key: 'teenagers', label: t('essay.audience_teenagers') },
      { key: 'youth', label: t('essay.audience_youth') }, { key: 'researchers', label: t('essay.audience_researchers') },
      { key: 'specialists', label: t('essay.audience_specialists') }, { key: 'other', label: t('essay.audience_other') },
  ];

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
  const handleRemoveImage = () => { /* ... */ };
  const handleGenerate = async () => { /* ... */ };

  const TabButton: React.FC<{ value: WritingMode; label: string; icon: React.ReactNode }> = ({ value, label, icon }) => (
    <button
      onClick={() => { setMode(value); setSubMode(null); }}
      className={`relative flex items-center space-x-2 py-3 px-4 rounded-lg text-sm transition-all duration-300 justify-center flex-shrink-0 ${
        mode === value ? 'text-white' : 'text-[#7C8599] hover:bg-[rgba(18,24,38,0.7)]'
      }`}
    >
      <span className={mode === value ? 'text-[#5B8CFF]' : 'opacity-60'}>{icon}</span>
      <span className="font-semibold">{label}</span>
      {mode === value && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] shadow-[0_0_8px_0_#5B8CFF]"></div>
      )}
    </button>
  );

  const ChipButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#5B8CFF] text-white shadow-md' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-white">
      {isLoading && <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-50"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#5B8CFF]"></div><p className="mt-4 font-bold">{t('essay.generating')}</p></div>}
      
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('tools.aiWriter')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <nav className="mt-1 flex items-center px-2 bg-transparent overflow-x-auto scrollbar-hide space-x-1"><TabButton value="essay" label={t('essay.essay')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} /><TabButton value="poem" label={t('essay.poem')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>} /><TabButton value="blog" label={t('essay.blog')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9M3 12a9 9 0 019-9m-9 9a9 9 0 009 9m-9-9h18" /></svg>} /><TabButton value="script" label={t('essay.script')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>} /></nav>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[#A78BFA]"><BrainIcon className="w-5 h-5" /><h3 className="font-semibold text-sm">Algor AI Assistant</h3></div>
          <textarea id="topic-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('essay.placeholder')} className="w-full h-36 bg-transparent rounded-2xl p-0 resize-none focus:outline-none text-base text-white placeholder:text-[#8A94A6]" />
        </div>
        
        {/* Attachments & Options */}
        <div className="bg-[rgba(18,24,38,0.6)] backdrop-blur-lg rounded-3xl p-5 border border-white/5 shadow-2xl space-y-6">
           {mode === 'essay' && (<div className="space-y-3"><label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essay.essayType')}</label><div className="flex flex-wrap gap-2">{essayTypes.map(type => (<ChipButton key={type.key} label={type.label} isActive={subMode === type.label} onClick={() => setSubMode(type.label)}/>))}</div></div>)}
           {mode === 'poem' && (<div className="space-y-6"><div className="space-y-3"><label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essay.poemForm')}</label><div className="flex flex-wrap gap-2">{poemForms.map(f => (<ChipButton key={f.key} label={f.label} isActive={poemForm === f.label} onClick={() => setPoemForm(f.label)}/>))}</div></div><div className="space-y-3"><label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essay.poemFeeling')}</label><div className="flex flex-wrap gap-2">{poemFeelings.map(f => (<ChipButton key={f.key} label={f.label} isActive={poemFeeling === f.label} onClick={() => setPoemFeeling(f.label)}/>))}</div></div><div className="space-y-3"><label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essay.languageLevel')}</label><div className="flex flex-wrap gap-2">{languageLevels.map(l => (<ChipButton key={l.key} label={l.label} isActive={languageLevel === l.label} onClick={() => setLanguageLevel(l.label)}/>))}</div></div></div>)}
           {(mode === 'blog' || mode === 'script') && (
               <div className="space-y-6">
                   <div className="space-y-3">
                       <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">Tone</label>
                       <div className="flex flex-wrap gap-2">
                           {tones.map(opt => (<ChipButton key={opt.key} label={opt.label} isActive={tone === opt.label} onClick={() => setTone(opt.label)}/>))}
                       </div>
                       {tone === t('essayHelper.tone_other') && <input type="text" value={customTone} onChange={(e) => setCustomTone(e.target.value)} placeholder={t('essayHelper.customTonePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
                   </div>
                   <div className="space-y-3">
                       <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">Audience</label>
                       <div className="flex flex-wrap gap-2">
                           {audiences.map(opt => (<ChipButton key={opt.key} label={opt.label} isActive={targetAudience === opt.label} onClick={() => setTargetAudience(opt.label)}/>))}
                       </div>
                       {/* FIX: Corrected typo from setCustomTargetAudata to setCustomTargetAudience */}
                       {targetAudience === t('essay.audience_other') && <input type="text" value={customTargetAudience} onChange={(e) => setCustomTargetAudience(e.target.value)} placeholder={t('essay.customAudiencePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
                   </div>
               </div>
           )}
           <div className="space-y-3">
                <label className="text-[#8A94A6] text-xs font-bold uppercase tracking-wider block">{t('essay.language')}</label>
                <div className="flex flex-wrap gap-2">
                    {languageOptions.map(opt => (<ChipButton key={opt.key} label={opt.value} isActive={outputLanguage === opt.key} onClick={() => setOutputLanguage(opt.key)} />))}
                </div>
                {outputLanguage === 'other' && <input type="text" value={customOutputLanguage} onChange={(e) => setCustomOutputLanguage(e.target.value)} placeholder={t('translator.customLanguagePlaceholder')} className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-2 ring-[#5B8CFF]/50 border border-white/10 mt-2"/>}
            </div>
        </div>

        <div className="pt-8" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <button onClick={handleGenerate} disabled={isLoading || (!topic.trim() && !fileContent && !image)} className="w-full h-[60px] bg-gradient-to-r from-[#5B8CFF] to-[#7C9DFF] text-white font-semibold text-lg py-4 px-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(91,140,255,0.35)] disabled:opacity-50 active:scale-[0.97]">
            {isLoading ? t('essay.generating') : t('essay.generate')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default EssayWriterScreen;
