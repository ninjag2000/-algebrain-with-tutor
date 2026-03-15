
import React, { useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { DailyChallengeSession } from '../../types';
import MathRenderer from '../../components/MathRenderer';
import { solveMathProblemFromText } from '../../services/geminiService';

// Reusable function to render markdown-like solution content
const renderSolutionContent = (content: string) => {
    return content.split('\n').map((line, lineIndex) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <div key={lineIndex} className="h-2" />;

        // Headings
        if (trimmedLine.startsWith('### ')) {
             const title = trimmedLine.substring(4);
             return <h3 key={lineIndex} className="font-bold text-sm text-blue-300 mt-4 mb-2 uppercase tracking-wider">{title}</h3>
        }

        // Centered Math Blocks
        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.split('**').length === 3) {
            const expression = trimmedLine.substring(2, trimmedLine.length - 2);
            // Heuristic to avoid treating sentences as math
            const isProbablySentence = expression.trim().split(' ').length > 4;
            if (!isProbablySentence) {
                return (
                    <div key={lineIndex} className="my-3 flex justify-center text-lg py-2">
                        <MathRenderer expression={expression} displayMode={true} />
                    </div>
                );
            }
        }
        
        // Regular text with inline math
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        return (
            <p key={lineIndex} className="leading-relaxed text-gray-400 text-sm mb-2">
                {parts.map((part, partIndex) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        const mathContent = part.substring(2, part.length - 2);
                        return <MathRenderer key={partIndex} expression={mathContent} className="mx-1 align-middle text-gray-200 font-medium" />;
                    }
                    return <span key={partIndex}>{part}</span>;
                })}
            </p>
        );
    });
};

interface DailyChallengeReviewScreenProps {
  session: DailyChallengeSession;
  onDone: () => void;
}

const DailyChallengeReviewScreen: React.FC<DailyChallengeReviewScreenProps> = ({ session, onDone }) => {
  const { t, language } = useLocalization();
  const [solutions, setSolutions] = useState<{ [key: number]: { solution: string | null; isLoading: boolean } }>({});

  const handleShowSolution = async (index: number, problem: string) => {
    // If solution is already visible, hide it.
    if (solutions[index]?.solution) {
      setSolutions(prev => {
        const newSolutions = { ...prev };
        delete newSolutions[index];
        return newSolutions;
      });
      return;
    }

    if (solutions[index]?.isLoading) return;

    setSolutions(prev => ({ ...prev, [index]: { solution: null, isLoading: true } }));
    try {
      const result = await solveMathProblemFromText(problem, language);
      const translatedResult = result.startsWith('error.') ? t(result) : result;
      setSolutions(prev => ({ ...prev, [index]: { solution: translatedResult, isLoading: false } }));
    } catch (error) {
      setSolutions(prev => ({ ...prev, [index]: { solution: t('error.solutionFail'), isLoading: false } }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1115] text-white">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onDone} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('challenge.review')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
        {session.answers.map((answer, index) => (
          <div key={index} className="bg-[#1A1D24] p-5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <p className="font-bold text-gray-400">Question {index + 1}</p>
              {answer.isCorrect ? (
                <span className="text-green-400 font-bold text-sm">✅ Correct</span>
              ) : (
                <span className="text-red-400 font-bold text-sm">❌ Incorrect</span>
              )}
            </div>
            
            <div className="text-lg font-semibold mb-4 text-center py-2">
              <MathRenderer expression={answer.question.question} displayMode={true} />
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Your Answer</p>
                <div className={`p-3 rounded-lg border ${answer.isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                   <MathRenderer expression={answer.userAnswer} className={answer.isCorrect ? 'text-green-300' : 'text-red-300'} />
                </div>
              </div>
              {!answer.isCorrect && (
                <>
                 <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Correct Answer</p>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <MathRenderer expression={answer.question.answer} className="text-gray-200" />
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                        onClick={() => handleShowSolution(index, answer.question.question)}
                        disabled={solutions[index]?.isLoading}
                        className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center space-x-2 disabled:opacity-50 transition-colors"
                    >
                        <span>{solutions[index]?.solution ? 'Скрыть решение' : 'Показать пошаговое решение'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${solutions[index]?.solution ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {solutions[index]?.isLoading && (
                        <div className="flex items-center space-x-2 mt-4 text-sm text-gray-400">
                           <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-blue-400"></div>
                           <span>Генерация решения...</span>
                        </div>
                    )}
                    
                    {solutions[index]?.solution && (
                        <div className="mt-4 bg-black/20 p-4 rounded-lg border border-white/10 animate-in fade-in duration-300">
                            {renderSolutionContent(solutions[index]!.solution!)}
                        </div>
                    )}
                </div>
                </>
              )}
            </div>
          </div>
        ))}
         <div className="pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <button onClick={onDone} className="w-full bg-[#5B8CFF] py-4 rounded-xl text-lg font-bold uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-transform">
                {t('assessment.done')}
            </button>
        </div>
      </main>
    </div>
  );
};

export default DailyChallengeReviewScreen;
