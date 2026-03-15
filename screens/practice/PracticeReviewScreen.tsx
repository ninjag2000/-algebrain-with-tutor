import React, { useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { PracticeQuestion } from '../../types';
import MathRenderer from '../../components/MathRenderer';
import { solveMathProblemFromText } from '../../services/geminiService';

const MAX_CHARS_PER_LINE = 35;

/** Для отображения «правильный ответ»: R / ℝ заменяем на интервал (-∞,+∞). */
function formatAnswerForDisplay(answer: string): string {
  const a = String(answer ?? '').trim();
  if (/^R$/i.test(a) || a === 'ℝ' || /^x\s*∈\s*R$/i.test(a) || /^все\s+действительные/i.test(a)) return '(-∞,+∞)';
  return a;
}

/** Разбивает формулу на строки, не разрывая скобки ( ) и [ ]. */
function splitQuestionForDisplay(question: string): string[] {
  const q = question.trim();
  if (q.length <= MAX_CHARS_PER_LINE) return [q];
  const lines: string[] = [];
  let rest = q;
  while (rest.length > 0) {
    if (rest.length <= MAX_CHARS_PER_LINE) {
      lines.push(rest.trim());
      break;
    }
    const chunk = rest.slice(0, MAX_CHARS_PER_LINE + 1);
    let breakAt = MAX_CHARS_PER_LINE;
    let depth = 0;
    let lastSafeSpace = -1;
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if ((c === ' ' || c === '+') && depth === 0) lastSafeSpace = i;
    }
    if (lastSafeSpace >= MAX_CHARS_PER_LINE / 2) breakAt = lastSafeSpace;
    else if (depth !== 0 && rest.length > MAX_CHARS_PER_LINE) {
      for (let i = MAX_CHARS_PER_LINE; i < rest.length; i++) {
        const c = rest[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') { depth--; if (depth === 0) { breakAt = i + 1; break; } }
      }
    }
    const line = rest.slice(0, breakAt).trim();
    rest = rest.slice(breakAt).trim();
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [q];
}

const renderSolutionContent = (content: string) => {
  return content.split('\n').map((line, lineIndex) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={lineIndex} className="h-2" />;
    if (trimmedLine.startsWith('### ')) {
      const title = trimmedLine.substring(4);
      return <h3 key={lineIndex} className="font-bold text-sm text-blue-300 mt-4 mb-2 uppercase tracking-wider">{title}</h3>;
    }
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.split('**').length === 3) {
      const expression = trimmedLine.substring(2, trimmedLine.length - 2);
      const isProbablySentence = expression.trim().split(' ').length > 4;
      if (!isProbablySentence) {
        return (
          <div key={lineIndex} className="my-3 flex justify-center text-lg py-2">
            <MathRenderer expression={expression} displayMode={true} />
          </div>
        );
      }
    }
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

interface PracticeReviewScreenProps {
  questions: PracticeQuestion[];
  onDone: () => void;
}

const PracticeReviewScreen: React.FC<PracticeReviewScreenProps> = ({ questions, onDone }) => {
  const { t, language } = useLocalization();
  const reviewTitle = t('practice.review_title') === 'practice.review_title' ? (language === 'ru' ? 'Разбор решений по шагам' : 'Review solutions') : t('practice.review_title');
  const reviewQuestionLabel = t('practice.review_question') === 'practice.review_question' ? (language === 'ru' ? 'Задание' : 'Problem') : t('practice.review_question');
  const reviewCorrectAnswerLabel = t('practice.review_correct_answer') === 'practice.review_correct_answer' ? (language === 'ru' ? 'Правильный ответ' : 'Correct answer') : t('practice.review_correct_answer');
  const reviewShowStepsLabel = t('practice.review_show_steps') === 'practice.review_show_steps' ? (language === 'ru' ? 'Показать решение по шагам' : 'Show solution step-by-step') : t('practice.review_show_steps');
  const reviewHideSolutionLabel = t('practice.review_hide_solution') === 'practice.review_hide_solution' ? (language === 'ru' ? 'Скрыть решение' : 'Hide solution') : t('practice.review_hide_solution');
  const [solutions, setSolutions] = useState<{ [key: number]: { solution: string | null; isLoading: boolean } }>({});

  const handleShowSolution = async (index: number, problem: string) => {
    if (solutions[index]?.solution) {
      setSolutions(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }
    if (solutions[index]?.isLoading) return;

    setSolutions(prev => ({ ...prev, [index]: { solution: null, isLoading: true } }));
    try {
      const result = await solveMathProblemFromText(problem, language);
      const translatedResult = result.startsWith('error.') ? t(result) : result;
      setSolutions(prev => ({ ...prev, [index]: { solution: translatedResult, isLoading: false } }));
    } catch {
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
          <h1 className="text-xl font-bold text-center truncate min-w-0">{reviewTitle}</h1>
          <div className="w-10" />
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
        {questions.map((q, index) => (
          <div key={index} className="bg-[#1A1D24] p-5 rounded-2xl border border-white/10 min-w-0">
            <p className="font-bold text-gray-400 mb-4">{reviewQuestionLabel} {index + 1}</p>
            <div className="text-lg font-semibold mb-4 text-center py-2 min-w-0 overflow-x-auto" style={{ wordBreak: 'break-word' }}>
              {splitQuestionForDisplay(q.question).map((line, i) => (
                <div key={i} className="min-h-[2rem] flex justify-center items-center">
                  <MathRenderer expression={line} displayMode={true} className="max-w-full" />
                </div>
              ))}
            </div>
            <div className="mb-3">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">{reviewCorrectAnswerLabel}</p>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <MathRenderer expression={formatAnswerForDisplay(q.answer)} className="text-gray-200" />
              </div>
            </div>
            <div className="pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleShowSolution(index, q.question)}
                disabled={solutions[index]?.isLoading}
                className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <span>{solutions[index]?.solution ? reviewHideSolutionLabel : reviewShowStepsLabel}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${solutions[index]?.solution ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {solutions[index]?.isLoading && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-blue-400" />
                  <span>{t('practice.review_loading') === 'practice.review_loading' ? (language === 'ru' ? 'Генерация решения...' : language === 'es' ? 'Generando solución...' : 'Generating solution...') : t('practice.review_loading')}</span>
                </div>
              )}
              {solutions[index]?.solution && (
                <div className="mt-4 bg-black/20 p-4 rounded-lg border border-white/10 animate-in fade-in duration-300">
                  {renderSolutionContent(solutions[index]!.solution!)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onDone} className="w-full bg-[#5B8CFF] py-4 rounded-xl text-lg font-bold uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-transform">
            {t('assessment.done')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default PracticeReviewScreen;
