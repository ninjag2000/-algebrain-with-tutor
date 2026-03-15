
import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';

const translations: { [key: string]: any } = {};

const defaultStrings: Record<string, string> = {
  'nav.tools': 'Tools',
  'nav.scan': 'Scan',
  'nav.tutor': 'Tutor',
  'nav.profile': 'Profile',
  'nav.history': 'More',
  'scan.auto': 'Auto',
  'scan.math': 'Math',
  'scan.translate': 'Translate',
  'scan.statusAuto': 'Detecting and solving...',
  'scan.statusMath': 'Scanning math...',
  'scan.statusTranslate': 'Scanning for translation...',
  'scan.statusSpelling': 'Checking spelling...',
  'scan.statusGeneral': 'Looking for question...',
  'scan.tip': 'Point camera at the problem',
  'calculator.analyzingLogic': 'Analyzing logic...',
  'translator.selectLanguage': 'Select language',
  'solution.stepByStepTitle': 'Step-by-step Solution',
  'solution.poweredByAI': 'Based on AI Logic Engine',
  'solution.retry': 'Retry',
  'solution.practiceSimilar': 'Practice Similar',
  'solution.explain': 'Explain',
  'solution.tryAnother': 'Try another',
  'solution.stepTitle': 'Step',
  'solution.targetProblem': 'Target Problem',
  'translator.translationResult': 'Translation Result',
  'scan.visionMode': 'Algor Vision Mode',
  'scan.flashOn': 'Flash on',
  'scan.flashOff': 'Flash off',
};

interface LocalizationContextValue {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
}

export const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

// Base URL for locales: in Capacitor Android file is next to index.html, so relative path works
const getLocalesBase = () => {
  if (typeof window === 'undefined') return '/locales';
  const href = window.location.href || '';
  // file:// or capacitor://: use path relative to index.html
  if (href.startsWith('file:') || href.includes('capacitor')) {
    const lastSlash = href.lastIndexOf('/');
    return lastSlash > 0 ? href.slice(0, lastSlash + 1) + 'locales' : '/locales';
  }
  return '/locales';
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('ru');
  const [isLoaded, setIsLoaded] = useState(true); // сразу показываем приложение, переводы подгружаем в фоне

  useEffect(() => {
    const base = getLocalesBase();
    const load = (name: string) =>
      fetch(`${base}/${name}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    Promise.all([load('en'), load('ru'), load('es')]).then(([en, ru, es]) => {
      if (en && Object.keys(en).length) translations.en = en;
      if (ru && Object.keys(ru).length) translations.ru = ru;
      if (es && Object.keys(es).length) translations.es = es;
      setIsLoaded(true);
    });
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: unknown = translations[language];
    for (const k of keys) {
      result = result != null && typeof result === 'object' ? (result as Record<string, unknown>)[k] : undefined;
    }
    if (typeof result === 'string') return result;
    if (language !== 'en' && translations.en) {
      let enResult: unknown = translations.en;
      for (const k of keys) {
        enResult = enResult != null && typeof enResult === 'object' ? (enResult as Record<string, unknown>)[k] : undefined;
      }
      if (typeof enResult === 'string') return enResult;
    }
    return defaultStrings[key] ?? key;
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
