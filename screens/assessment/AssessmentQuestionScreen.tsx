import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import MathRenderer from '../../components/MathRenderer';
import CalculatorKeyboard from '../../components/CalculatorKeyboard';
import AdvancedCalculatorKeyboard from '../../components/AdvancedCalculatorKeyboard';
import ExpressionWithCursorDisplay from '../../components/ExpressionWithCursorDisplay';
import {
  type QuestionItem,
  QUESTIONS_BY_LEVEL,
  MIN_LEVEL,
  MAX_LEVEL,
  INITIAL_LEVEL,
} from './assessmentQuestions';
import type { AssessmentResult } from './types';
import { getSkillFromQuestion } from './getSkillFromQuestion';
import { getLogicalCursorLeft, getLogicalCursorRight, getBackspaceDeletionRange, FRAC_INSERT_CURSOR_OFFSET } from '../../utils/cursorNavigation';

interface AssessmentQuestionScreenProps {
  onComplete: (result: AssessmentResult) => void;
  onBack?: () => void;
}

const TOTAL_STEPS = 5;

const getExpectedAnswers = (q: QuestionItem): string[] =>
  Array.isArray(q.answer) ? q.answer : [q.answer];

function pickQuestion(level: number, excludeIndex: number): QuestionItem {
  const pool = QUESTIONS_BY_LEVEL[level] ?? QUESTIONS_BY_LEVEL[1];
  if (pool.length <= 1) return pool[0];
  let idx = Math.floor(Math.random() * pool.length);
  if (idx === excludeIndex && pool.length > 1) idx = (idx + 1) % pool.length;
  return pool[idx];
}

const AssessmentQuestionScreen: React.FC<AssessmentQuestionScreenProps> = ({ onComplete, onBack }) => {
  const { t } = useLocalization();
  const [level, setLevel] = useState(INITIAL_LEVEL);
  const [step, setStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem>(() => pickQuestion(INITIAL_LEVEL, -1));
  const stepResultsRef = useRef<AssessmentResult['steps']>([]);

  const expectedAnswers = getExpectedAnswers(currentQuestion);
  const numFields = expectedAnswers.length;

  const [userAnswers, setUserAnswers] = useState<string[]>(() => expectedAnswers.map(() => ''));
  const [cursorIndices, setCursorIndices] = useState<number[]>(() => expectedAnswers.map(() => 0));
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [showAdvancedKeyboard, setShowAdvancedKeyboard] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string, correct: boolean } | null>(null);

  // Следующее задание берётся с нового уровня: при правильном ответе уровень был повышен, при неправильном — понижен.
  useEffect(() => {
    if (step < TOTAL_STEPS) setCurrentQuestion(pickQuestion(level, -1));
  }, [level, step]);

  useEffect(() => {
    setUserAnswers(getExpectedAnswers(currentQuestion).map(() => ''));
    setCursorIndices(getExpectedAnswers(currentQuestion).map(() => 0));
    setActiveFieldIndex(0);
  }, [currentQuestion]);

  useEffect(() => {
    if (feedback) {
      const correct = feedback.correct;
      const timer = setTimeout(() => {
        setFeedback(null);
        // Правильно — следующий уровень; неправильно — уровень понижается.
        setLevel(prev => correct ? Math.min(MAX_LEVEL, prev + 1) : Math.max(MIN_LEVEL, prev - 1));
        setStep(prev => {
          const next = prev + 1;
          if (next >= TOTAL_STEPS) onComplete({ steps: stepResultsRef.current });
          return next;
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [feedback, onComplete]);

  const normalizeAnswer = (s: string): string => {
    let t = s.replace(/\s*x\s*=\s*/i, '').trim();
    t = t.replace(/frac\s*\{\s*([^{}]*)\s*\}\s*\{\s*([^{}]*)\s*\}/gi, (_, num, den) => `${num.trim()}/${den.trim()}`);
    t = t.replace(/\s*\/\s*/g, '/');
    return t;
  };

  const handleSubmit = () => {
    if (feedback) return;
    const normalizedUser = userAnswers.map(normalizeAnswer).filter(Boolean);
    const normalizedExpected = expectedAnswers.map(normalizeAnswer);
    if (normalizedUser.length !== normalizedExpected.length) {
      stepResultsRef.current = [...stepResultsRef.current, { level, correct: false, skill: getSkillFromQuestion(currentQuestion.question) }];
      setFeedback({ message: t('assessment.feedback_mistake'), correct: false });
      return;
    }
    const sortedUser = [...normalizedUser].sort();
    const sortedExpected = [...normalizedExpected].sort();
    const isCorrect = sortedUser.length === sortedExpected.length && sortedUser.every((v, i) => v === sortedExpected[i]);
    stepResultsRef.current = [...stepResultsRef.current, { level, correct: isCorrect, skill: getSkillFromQuestion(currentQuestion.question) }];
    setFeedback({
      message: isCorrect ? t('assessment.feedback_good') : t('assessment.feedback_mistake'),
      correct: isCorrect,
    });
  };

  const insertAtCursor = (text: string, fieldIdx: number) => {
    const maxLen = 200;
    const cur = userAnswers[fieldIdx] ?? '';
    if (cur.length + text.length > maxLen) return;
    const ci = cursorIndices[fieldIdx] ?? 0;
    setUserAnswers(prev => {
      const next = [...prev];
      next[fieldIdx] = cur.slice(0, ci) + text + cur.slice(ci);
      return next;
    });
    setCursorIndices(prev => {
      const next = [...prev];
      next[fieldIdx] = (cursorIndices[fieldIdx] ?? 0) + text.length;
      return next;
    });
  };

  const handleKeyPress = (key: string) => {
    if (feedback) return;
    const idx = activeFieldIndex;
    const userAnswer = userAnswers[idx] ?? '';
    const cursorIndex = cursorIndices[idx] ?? 0;

    if (key === 'left') {
      setCursorIndices(prev => { const n = [...prev]; n[idx] = getLogicalCursorLeft(userAnswer, cursorIndex); return n; });
    } else if (key === 'right') {
      setCursorIndices(prev => { const n = [...prev]; n[idx] = getLogicalCursorRight(userAnswer, cursorIndex); return n; });
    } else if (key === 'backspace') {
      if (cursorIndex > 0) {
        const range = getBackspaceDeletionRange(userAnswer, cursorIndex);
        if (range) {
          setUserAnswers(prev => { const n = [...prev]; n[idx] = userAnswer.slice(0, range.start) + userAnswer.slice(range.end); return n; });
          setCursorIndices(prev => { const n = [...prev]; n[idx] = range.start; return n; });
        } else {
          setUserAnswers(prev => { const n = [...prev]; n[idx] = userAnswer.slice(0, cursorIndex - 1) + userAnswer.slice(cursorIndex); return n; });
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex - 1; return n; });
        }
      }
    } else if (key === 'AC') {
      setUserAnswers(prev => { const n = [...prev]; n[idx] = ''; return n; });
      setCursorIndices(prev => { const n = [...prev]; n[idx] = 0; return n; });
    } else if (key === '=') {
      handleSubmit();
    } else {
      switch (key) {
        case 'x²': insertAtCursor('^(2)', idx); break;
        case 'x³': insertAtCursor('^(3)', idx); break;
        case 'xⁿ': insertAtCursor('^()', idx); break;
        case '√':
          insertAtCursor('√()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 2; return n; });
          break;
        case '³√':
          insertAtCursor('√[3]()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 5; return n; });
          break;
        case 'ⁿ√':
          insertAtCursor('√[]()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 2; return n; });
          break;
        case 'a/b': {
          insertAtCursor('frac{}{}', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + FRAC_INSERT_CURSOR_OFFSET; return n; });
          break;
        }
        case 'mixfrac': insertAtCursor('mixfrac{}{}{}', idx); break;
        case 'system': insertAtCursor('system{;}', idx); break;
        case '÷': insertAtCursor('/', idx); break;
        case '×': insertAtCursor('*', idx); break;
        case 'log':
          insertAtCursor('log[]()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 4; return n; });
          break;
        case 'lg':
          insertAtCursor('log[10]()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 6; return n; });
          break;
        case 'ln':
          insertAtCursor('log[e]()', idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + 5; return n; });
          break;
        case 'sin':
        case 'cos':
        case 'tan':
        case 'ctg':
        case 'arcsin':
        case 'arccos':
        case 'arctan':
        case 'arcctg': {
          const template = key + '()';
          insertAtCursor(template, idx);
          setCursorIndices(prev => { const n = [...prev]; n[idx] = cursorIndex + key.length; return n; });
          break;
        }
        case 'e':
        case '°':
        case '30°':
        case '45°':
        case '60°':
        case '[':
        case ']':
        case 'a':
        case 'b':
        case 'c':
        case 'm':
        case 'n':
        case 'k':
        case 'π':
        case '∞':
          insertAtCursor(key, idx);
          break;
        default:
          if (key === '>=' || key === '<=' || (key.length >= 1 && /^[xy\d.\-\+\/()%,<> ]+$/.test(key))) {
            insertAtCursor(key, idx);
          }
          break;
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white p-6 relative overflow-hidden">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <div className="w-10">
            {onBack && (
              <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
          </div>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('assessment.scan_title')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center pt-4 min-h-0">
        <div className="bg-[rgba(18,24,38,0.7)] backdrop-blur-xl rounded-xl py-2 px-3 border border-white/10 shadow-2xl w-full max-w-sm max-h-[100px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <h2 className="text-base font-bold tracking-tight leading-tight">
            <MathRenderer expression={currentQuestion.question} displayMode={true} />
          </h2>
        </div>
      </div>

      <div className="pb-safe flex flex-col">
        <div className={`w-full max-w-md mx-auto mb-2 flex gap-3 ${numFields > 1 ? 'flex-row' : 'flex-col'}`}>
          {expectedAnswers.map((_, fieldIdx) => (
            <div key={fieldIdx} className={`flex flex-col gap-1 ${numFields > 1 ? 'flex-1 min-w-0' : ''}`}>
              {numFields > 1 && (
                <span className="text-xs font-medium text-white/60">
                  {t('assessment.answer')} {fieldIdx + 1}
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveFieldIndex(fieldIdx)}
                className={`w-full min-h-[72px] text-left rounded-lg p-3 bg-[#1a1a24]/30 shadow-[0_0_15px_rgba(58,141,255,0.3)] flex flex-col justify-end transition-all ${activeFieldIndex === fieldIdx ? 'ring-2 ring-[#5B8CFF] ring-offset-2 ring-offset-[#0B0F1A]' : ''}`}
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="min-h-[56px] text-2xl text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-2" style={{ lineHeight: 1.4 }}>
                  {!(userAnswers[fieldIdx]) && <span className="text-white/30">0</span>}
                  {userAnswers[fieldIdx] ? (
                    <ExpressionWithCursorDisplay
                      expression={userAnswers[fieldIdx] ?? ''}
                      cursorPosition={cursorIndices[fieldIdx] ?? 0}
                      showCursor={!feedback && activeFieldIndex === fieldIdx}
                    />
                  ) : !feedback && activeFieldIndex === fieldIdx && (
                    <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="max-w-lg mx-auto w-full px-2">
          {showAdvancedKeyboard ? (
            <AdvancedCalculatorKeyboard
              onKeyPress={handleKeyPress}
              toggleKeyboard={() => setShowAdvancedKeyboard(false)}
              onCalculate={handleSubmit}
              isCalculating={!!feedback}
            />
          ) : (
            <CalculatorKeyboard
              onKeyPress={handleKeyPress}
              toggleKeyboard={() => setShowAdvancedKeyboard(true)}
              onCalculate={handleSubmit}
              isCalculating={!!feedback}
            />
          )}
        </div>
      </div>

      {feedback && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-20 animate-in fade-in duration-300">
          <div className="flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-300">
            <TutorAvatarIcon className="w-24 h-24" />
            <p className={`text-lg font-semibold px-6 py-3 rounded-full border ${feedback.correct ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}`}>
              {feedback.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentQuestionScreen;
