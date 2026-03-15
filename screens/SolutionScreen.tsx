import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';
import { HistoryItem, VerificationResult } from '../types';
import MathRenderer from '../components/MathRenderer';
import { getExplanationForSolution, getStepExplanation, getSmartProgressInsight } from '../services/geminiService';
import LightbulbIcon from '../components/icons/LightbulbIcon';
import SmartProgressWidget from '../components/SmartProgressWidget';

// PROPS
interface SolutionScreenProps {
  item: HistoryItem;
  collection: HistoryItem[];
  onToggleCollection: (item: HistoryItem) => void;
  onBack: () => void;
  isPro: boolean;
  onOpenPaywall: () => void;
  onPracticeSimilar: (problem: string) => void;
  verificationResult: VerificationResult | null;
}

// TYPES
type Step = { title: string; content: string };
type ExplanationLevel = 'Detailed' | 'Advanced';

/** Parse solution into steps. Prefer ### headings; fallback to numbered lines (1. 2. or Step N / Шаг N) so any model output still yields step-by-step. */
function parseSolutionSteps(solution: string): { steps: Step[]; finalAnswer: Step | null } {
  const trim = (s: string) => s.trim();
  const cleanTitle = (raw: string) =>
    raw.replace(/\*\*/g, '').replace(/^(Шаг|Step|Этап)\s*\d+[:\-\s—]*/i, '').trim() || raw;

  // 1) Split by ### (primary format requested from AI)
  let rawSteps = solution.split('### ').map(trim).filter(Boolean);

  // 2) If no ###, try splitting by numbered step lines (e.g. "1. ", "2) ", "Step 1:", "Шаг 1 —")
  if (rawSteps.length <= 1 && solution.trim()) {
    const stepStart = /(?:\r?\n)(?=(?:###\s*)?(?:Шаг|Step|Этап)\s*\d+[.:\-\s)—]|\d+[.)]\s+)/i;
    const parts = solution.split(stepStart).map(trim).filter(Boolean);
    if (parts.length > 1) rawSteps = parts;
  }

  const parsedSteps: Step[] = rawSteps.map((block, index) => {
    const lines = block.split('\n');
    const firstLine = lines[0]?.trim() ?? '';
    const rawTitle = firstLine.replace(/\*\*/g, '');
    const title = cleanTitle(rawTitle) || (index === 0 ? 'Решение' : 'Шаг');
    const content =
      lines.length > 1
        ? lines.slice(1).join('\n').trim()
        : lines.length === 1 && firstLine
          ? firstLine
          : block.trim();
    return { title, content: content || firstLine };
  });

  let steps = parsedSteps.filter((s) => s.title || s.content);
  let finalAnswer: Step | null = null;

  if (steps.length > 0) {
    const last = steps[steps.length - 1]!;
    const lastTitle = last.title.toLowerCase();
    if (lastTitle.includes('ответ') || lastTitle.includes('answer') || lastTitle.includes('финал') || lastTitle.includes('final')) {
      finalAnswer = last;
      steps = steps.slice(0, -1);
    }
  }

  // If we still have a single block with no structure, show as one step
  if (steps.length === 0 && solution.trim()) {
    steps = [{ title: 'Решение', content: solution.trim() }];
  }

  return { steps, finalAnswer };
}

/** Renders text with **math** segments rendered via KaTeX. */
const renderTextWithMath = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const expr = part.slice(2, -2).trim();
            if (!expr) return <span key={i}>{part}</span>;
            return <MathRenderer key={i} expression={expr} className="align-middle text-[#E6EAF2] mx-0.5" />;
        }
        return <span key={i}>{part}</span>;
    });
};

const renderSolutionContent = (content: string) => {
    // If the content is for translation, display it as plain text without math rendering logic.
    // This is a simple heuristic; more robust detection might be needed for mixed content.
    const isTranslationOutput = content.includes('Переведено на :');
    
    if (isTranslationOutput) {
      // Split by new lines, render as paragraphs
      return content.split('\n').map((line, lineIndex) => (
        <p key={lineIndex} className="leading-relaxed text-[#9AA3B2] text-[15px] flex-1 mb-2">{line}</p>
      ));
    }


    return content.split('\n').map((line, lineIndex) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <div key={lineIndex} className="h-3" />;

        // Center block detection (e.g. **expression**)
        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.split('**').length === 3) {
            const expression = trimmedLine.substring(2, trimmedLine.length - 2);
            const isProbablySentence = expression.trim().split(' ').length > 3;
            
            if (!isProbablySentence) {
                return (
                    <div key={lineIndex} className="my-4 flex justify-center text-xl py-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                        <MathRenderer expression={expression} displayMode={true} scrollable />
                    </div>
                );
            }
        }
        
        // Bullet points and regular text parsing
        const isBullet = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
        const cleanLine = isBullet ? trimmedLine.substring(2) : line;

        // Split by bold markers for inline math
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        
        return (
            <div key={lineIndex} className={`mb-3 flex items-start ${isBullet ? 'pl-2' : ''}`}>
                {isBullet && <span className="mr-3 text-[#3A8DFF] mt-1 text-lg">•</span>}
                <p className="leading-relaxed text-[#9AA3B2] text-[15px] flex-1">
                    {parts.map((part, partIndex) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            const mathContent = part.substring(2, part.length - 2);
                            const isProbablySentence = mathContent.trim().split(' ').length > 4;
                            
                            if (isProbablySentence) {
                                return <span key={partIndex} className="font-bold text-white">{mathContent}</span>;
                            }
                            return (
                                <MathRenderer 
                                    key={partIndex} 
                                    expression={mathContent} 
                                    className="mx-1 align-middle text-white font-semibold" 
                                />
                            );
                        }
                        
                        // Fallback: check for math characters in plain text parts
                        const mathPatterns = /[\^√\/\(\)\{\}\=]/;
                        if (mathPatterns.test(part) && part.length < 50 && !part.includes(' ')) {
                             return <MathRenderer key={partIndex} expression={part} className="mx-0.5 align-middle text-white" />;
                        }

                        return <span key={partIndex}>{part}</span>;
                    })}
                </p>
            </div>
        );
    });
};

const SolutionScreen: React.FC<SolutionScreenProps> = ({ item, collection, onToggleCollection, onBack, isPro, onOpenPaywall, onPracticeSimilar, verificationResult }) => {
  const { t, language } = useLocalization();
  const [steps, setSteps] = useState<Step[]>([]);
  const [finalAnswer, setFinalAnswer] = useState<Step | null>(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('Detailed');
  const [detailedExplanation, setDetailedExplanation] = useState<string>('');
  const [advancedExplanation, setAdvancedExplanation] = useState<string>('');
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [stepExplanations, setStepExplanations] = useState<{ [key: number]: { text: string; isLoading: boolean } }>({});
  const [showCorrectSolution, setShowCorrectSolution] = useState(verificationResult?.isCorrect ?? true);
  const [insightPayload, setInsightPayload] = useState<any | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const FREE_STEPS_LIMIT = 2;
  const isFavorited = useMemo(() => collection.some(c => c.id === item.id), [collection, item]);
  
  // Determine if the current item is a translation to hide irrelevant buttons
  const isTranslateMode = item.mode === 'translate';

  useEffect(() => {
      // For translate mode, treat the solution as a single "step"
      if (isTranslateMode) {
          setSteps([{ title: t('translator.translationResult'), content: item.solution }]);
          setFinalAnswer(null); // No separate final answer for translations
          setInsightPayload(null); // No insights for translations
          setShowCorrectSolution(true);
          return;
      }

      const { steps: parsedSteps, finalAnswer: parsedFinal } = parseSolutionSteps(item.solution);
      setSteps(parsedSteps);
      setFinalAnswer(parsedFinal);
      setDetailedExplanation('');
      setAdvancedExplanation('');
      setStepExplanations({});
      setShowCorrectSolution(verificationResult?.isCorrect ?? true);
      
      if (verificationResult?.isCorrect && !isTranslateMode) {
        const fetchInsight = async () => {
          const insightData = await getSmartProgressInsight(item.problem, language);
          setInsightPayload({
              ...insightData,
              improvement: 12 + Math.floor(Math.random() * 5),
              accuracy: 94 + Math.floor(Math.random() * 5)
          });
        };
        fetchInsight();
      } else {
          setInsightPayload(null);
      }
  }, [item, verificationResult, language, isTranslateMode, t]);
  
  const fetchExplanation = async (level: ExplanationLevel) => {
    if ((level === 'Detailed' && detailedExplanation) || (level === 'Advanced' && advancedExplanation) || isExplanationLoading || isTranslateMode) {
      return;
    }

    setIsExplanationLoading(true);
    try {
      let fullSolutionText = steps.map((s, i) => `Step ${i+1}: ${s.title}\n${s.content}`).join('\n\n');
      if (finalAnswer) {
          fullSolutionText += `\n\nFinal Answer: ${finalAnswer.title}\n${finalAnswer.content}`;
      }

      const apiLevel = level === 'Detailed' ? 'detailed' : 'advanced';
      const explanation = await getExplanationForSolution(item.problem, fullSolutionText, apiLevel, language);
      const translatedExplanation = explanation.startsWith('error.') ? t(explanation) : explanation;

      if (level === 'Detailed') {
        setDetailedExplanation(translatedExplanation);
      } else {
        setAdvancedExplanation(translatedExplanation);
      }
    } catch (e) {
      const errorMsg = t('error.solutionFail');
      if (level === 'Detailed') setDetailedExplanation(errorMsg);
      else setAdvancedExplanation(errorMsg);
    } finally {
      setIsExplanationLoading(false);
    }
  };
  
  const handleExplanationToggle = (isOpen: boolean) => {
    setIsExplanationOpen(isOpen);
    if (isOpen && !detailedExplanation && !isTranslateMode) {
      fetchExplanation('Detailed');
    }
  };

  const handleLevelChange = (level: ExplanationLevel) => {
    setExplanationLevel(level);
    if (level === 'Detailed' && !detailedExplanation && !isTranslateMode) {
      fetchExplanation('Detailed');
    } else if (level === 'Advanced' && !advancedExplanation && isPro && !isTranslateMode) {
      fetchExplanation('Advanced');
    }
  };
  
  const handleFooterExplainClick = () => {
    if (isTranslateMode) return; // Disable for translate mode
    if (detailsRef.current) {
        if (!detailsRef.current.open) {
            detailsRef.current.open = true;
        }
        detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAskWhy = async (stepIndex: number, stepContent: string) => {
    if (!isPro || isTranslateMode) {
        onOpenPaywall(); // Still show paywall even if translate mode, just for consistent UX if somehow triggered.
        return;
    }
    if (stepExplanations[stepIndex]?.text) {
        const newExplanations = {...stepExplanations};
        delete newExplanations[stepIndex];
        setStepExplanations(newExplanations);
        return;
    }

    setStepExplanations(prev => ({ ...prev, [stepIndex]: { text: '', isLoading: true } }));
    
    try {
        const explanation = await getStepExplanation(item.problem, item.solution, stepContent, language);
        const translatedExplanation = explanation.startsWith('error.') ? t(explanation) : explanation;
        setStepExplanations(prev => ({ ...prev, [stepIndex]: { text: translatedExplanation, isLoading: false } }));
    } catch (e) {
        setStepExplanations(prev => ({ ...prev, [stepIndex]: { text: t('error.solutionFail'), isLoading: false } }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F1A] text-[#E6EAF2] overflow-hidden">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_88px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label={t('solution.backToCalculator')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-black text-center tracking-tight truncate uppercase opacity-80 min-w-0">AlgeBrain Solution</h1>
          <div className="flex items-center justify-end space-x-2 flex-shrink-0">
            <button onClick={() => onToggleCollection(item)} aria-label={isFavorited ? t('solution.removeFromCollection') : t('solution.addToCollection')} className={`w-10 h-10 flex items-center justify-center transition-all ${isFavorited ? 'text-[#3A8DFF]' : 'text-white/40'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg></button>
            <button aria-label={t('solution.share')} className="w-10 h-10 flex items-center justify-center text-white/40"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg></button>
          </div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-5 scroll-smooth scrollbar-hide pb-40">
        {verificationResult && (
          <div className={`p-6 rounded-[2rem] mb-8 border-2 animate-in fade-in duration-500 ${verificationResult.isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
              <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${verificationResult.isCorrect ? 'text-green-400' : 'text-yellow-400'}`}>
                {verificationResult.isCorrect ? '✅' : '🤔'}
                <span className="ml-2">{verificationResult.isCorrect ? t('solution.correct') : t('solution.improvementNeeded')}</span>
              </h3>
              <p className="mt-3 text-base text-white/90 italic">“{verificationResult.feedback}”</p>
              <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-white/50 mb-2 uppercase font-bold tracking-widest">{t('solution.yourAnswer')}:</p>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <MathRenderer expression={verificationResult.userAnswer} className="text-white text-lg"/>
                  </div>
              </div>
          </div>
        )}
        
        {insightPayload && !isTranslateMode && ( // Hide insight widget in translate mode
            <div className="my-8 animate-in fade-in duration-500">
                <SmartProgressWidget payload={insightPayload} />
            </div>
        )}

        <div className="bg-[#121826] p-7 rounded-[2.5rem] border border-white/5 mb-8 animate-in fade-in duration-500 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3A8DFF]/5 to-transparent"></div>
          <p className="text-[10px] font-black text-[#5B8CFF] uppercase tracking-[0.4em] mb-4 relative z-10">{isTranslateMode ? t('translator.sourceText') : t('solution.targetProblem')}</p>
          <div className="text-2xl font-black text-white py-2 relative z-10 overflow-x-auto scrollbar-hide text-center">
            {isTranslateMode ? (
                <p className="whitespace-pre-wrap">{item.problem}</p>
            ) : (
                <MathRenderer expression={item.problem} displayMode={true} />
            )}
          </div>
        </div>
        
        {!showCorrectSolution && (
            <div className="text-center my-10 animate-in fade-in duration-500">
                <button onClick={() => setShowCorrectSolution(true)} aria-label={t('solution.showCorrectSolution')} className="bg-white text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-3xl active:scale-95 transition-all">
                    {t('solution.showCorrectSolution')}
                </button>
            </div>
        )}

        {showCorrectSolution && (
          <div className="animate-in fade-in duration-700">
            <div className="mb-12">
                <h2 className="text-2xl font-black text-white mb-1 tracking-tighter">
                    {isTranslateMode ? t('translator.translationResult') : t('solution.stepByStepTitle')}
                </h2>
                {!isTranslateMode && ( // Hide "Powered by AI" for translations
                    <p className="text-[11px] font-bold text-[#8A94A6] uppercase tracking-[0.2em] mb-8">{t('solution.poweredByAI')}</p>
                )}
                <div className="space-y-5 relative">
                    {steps.map((step, i) => {
                        const explanation = stepExplanations[i];
                        return (
                            <div key={i} className={`relative transition-all duration-700 ${!isPro && i >= FREE_STEPS_LIMIT && !isTranslateMode ? 'blur-md opacity-30 pointer-events-none' : ''} animate-in fade-in slide-in-from-bottom-6`} style={{animationDelay: `${i * 120}ms`}}>
                            <div className="bg-[#141821] p-5 rounded-[1.125rem] border border-white/10 shadow-lg">
                                {(!isTranslateMode || steps.length > 1) && (
                                <h3 className="font-black text-sm text-[#3A8DFF] mb-5 uppercase tracking-widest">
                                    {isTranslateMode ? step.title : (() => {
                                        const stepOnly = /^(Шаг|Step|Этап)\s*\d+$/i.test(step.title.trim()) || /^\d+$/.test(step.title.trim()) || !step.title.trim();
                                        return stepOnly ? `${t('solution.stepTitle')} ${i + 1}` : `${t('solution.stepTitle')} ${i + 1} — ${step.title}`;
                                    })()}
                                </h3>
                                )}
                                <div className="space-y-1">
                                    {renderSolutionContent(step.content)}
                                </div>
                                {!isTranslateMode && ( // Hide "Ask Why" in translate mode
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <button 
                                            onClick={() => handleAskWhy(i, `${step.title}\n${step.content}`)}
                                            className="flex items-center space-x-2 text-xs font-bold text-blue-400/80 hover:text-blue-400 transition-colors group disabled:opacity-50"
                                            disabled={explanation?.isLoading}
                                            aria-label={t('solution.askWhy')}
                                        >
                                            <LightbulbIcon className="w-4 h-4" />
                                            <span>{t('solution.askWhy')}</span>
                                            {!isPro && <span className="text-yellow-400 text-[8px] font-bold bg-gray-900 px-1.5 py-0.5 rounded-full">PRO</span>}
                                        </button>
                                    </div>
                                )}
                                {explanation && (
                                    <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/10 animate-in fade-in duration-300">
                                    {explanation.isLoading ? (
                                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-blue-400"></div>
                                        <span>{t('solution.askWhyLoading')}</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-300 leading-relaxed italic">{renderTextWithMath(explanation.text)}</div>
                                    )}
                                    </div>
                                )}
                            </div>
                            </div>
                        );
                    })}
                    
                    {!isPro && steps.length > FREE_STEPS_LIMIT && !isTranslateMode && ( // Hide unlock button in translate mode
                        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0B0F1A] to-transparent flex items-end justify-center pb-6 z-10">
                            <button onClick={onOpenPaywall} aria-label={t('solution.unlockButton')} className="bg-white text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-3xl active:scale-95 transition-all">Unlock Full Logic</button>
                        </div>
                    )}
                </div>
            </div>

            {finalAnswer && !isTranslateMode && ( // Hide final answer in translate mode
                <div className="bg-gradient-to-br from-[#3A8DFF]/10 to-[#A78BFA]/10 p-8 rounded-[2.5rem] border border-[#3A8DFF]/30 shadow-2xl mb-12 animate-in fade-in zoom-in-95 duration-700 delay-300">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                        <h3 className="font-black text-xl text-white uppercase tracking-tight">{t('solution.finalAnswer')}</h3>
                    </div>
                    <div className="text-xl font-black text-[#5B8CFF] mb-6 bg-black/30 p-4 rounded-2xl border border-white/5 inline-block min-w-[100px] text-center">
                        <MathRenderer expression={finalAnswer.title} />
                    </div>
                    <div className="text-[#9AA3B2]">
                        {renderSolutionContent(finalAnswer.content)}
                    </div>
                </div>
            )}
            
            {!isTranslateMode && ( // Hide AI Explanation in translate mode
                <details ref={detailsRef} onToggle={(e) => handleExplanationToggle(e.currentTarget.open)} className="bg-[#121826] rounded-[2.5rem] border border-white/5 overflow-hidden mb-16 shadow-3xl transition-all group">
                <summary className="p-6 flex justify-between items-center cursor-pointer hover:bg-white/5 list-none" aria-label={t('solution.aiExplanationTitle')}>
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full border border-white/10 bg-[#0B0F1A] p-1 shadow-inner">
                            <TutorAvatarIcon variant="tutor" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-[0.3em] text-white/80">{t('solution.aiExplanationTitle')}</span>
                    </div>
                    <svg className="w-5 h-5 text-[#8A94A6] transition-transform duration-500 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="p-7 border-t border-white/5 bg-black/20">
                    <div className="flex space-x-3 mb-8">
                        {(['Detailed', 'Advanced'] as ExplanationLevel[]).map(level => (
                            <button 
                                key={level} 
                                onClick={() => handleLevelChange(level)} 
                                aria-label={t(`solution.explanation${level}`)}
                                className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all relative ${explanationLevel === level ? 'bg-[#5B8CFF] text-white shadow-xl translate-y-[-2px]' : 'bg-white/5 text-[#8A94A6] hover:bg-white/10'}`}
                            >
                                {t(`solution.explanation${level}`)}
                                {level === 'Advanced' && !isPro && <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black px-1.5 py-0.5 rounded-lg text-[7px] font-black">PRO</span>}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-[120px] relative">
                        {isExplanationLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-[#5B8CFF]"></div>
                            </div>
                        ) : explanationLevel === 'Detailed' ? (
                            <div className="animate-in fade-in duration-500">
                                <div className="text-[15px] text-gray-300 leading-relaxed italic bg-white/5 p-6 rounded-[2rem] border-l-4 border-[#3A8DFF] shadow-inner">
                                    {detailedExplanation.split('\n').map((para, i) => (
                                        <p key={i} className="mb-2 last:mb-0">{renderTextWithMath(para)}</p>
                                    ))}
                                </div>
                            </div>
                        ) : !isPro ? (
                            <div className="text-center py-10 bg-black/40 rounded-[2.5rem] border border-dashed border-white/10 animate-in zoom-in-95 duration-400">
                                <p className="text-sm text-[#8A94A6] mb-8 px-8 leading-relaxed font-medium">Продвинутый уровень объяснений включает глубокий нейронный анализ и теоремы, доступные только в Pro-версии.</p>
                                <button onClick={onOpenPaywall} aria-label={t('paywall.cta')} className="bg-gradient-to-r from-[#3A8DFF] to-[#A78BFA] text-white text-[10px] font-black uppercase tracking-[0.3em] px-10 py-4 rounded-2xl shadow-3xl active:scale-95 transition-all">Upgrade Brain</button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                <div className="flex items-center space-x-3 mb-6 text-[#A78BFA]">
                                    <div className="w-2 h-2 bg-[#A78BFA] rounded-full animate-ping"></div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Active Cognitive Analysis</span>
                                </div>
                                <div className="text-[15px] text-gray-200 leading-relaxed font-medium">
                                    {advancedExplanation.split('\n').map((para, i) => (
                                        <p key={i} className="mb-2 last:mb-0">{renderTextWithMath(para)}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </details>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-[#0F1115]/95 backdrop-blur-3xl z-50 border-t border-white/5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center space-x-4">
            <button onClick={onBack} aria-label={t('solution.tryAnother')} className="flex-1 bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#8A94A6] active:scale-95 transition-all">{t('solution.retry')}</button>
            {!isTranslateMode && ( // Hide Practice Similar in translate mode
                <button onClick={() => onPracticeSimilar(item.problem)} aria-label={t('solution.practiceSimilar')} className="flex-[1.8] bg-[#3A8DFF] shadow-[0_12px_30px_rgba(58,141,255,0.4)] px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.18em] text-white active:scale-[0.98] transition-all">{t('solution.practiceSimilar')}</button>
            )}
            {!isTranslateMode && ( // Hide Explain in translate mode
                <button onClick={handleFooterExplainClick} aria-label={t('solution.explain')} className="flex-1 bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#8A94A6] active:scale-95 transition-all">{t('solution.explain')}</button>
            )}
        </div>
      </footer>
    </div>
  );
};

export default SolutionScreen;