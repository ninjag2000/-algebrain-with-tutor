import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { DailyChallengeSession } from '../../types';
import MathRenderer from '../../components/MathRenderer';
import CalculatorKeyboard from '../../components/CalculatorKeyboard';
import AdvancedCalculatorKeyboard from '../../components/AdvancedCalculatorKeyboard';
import ExpressionWithCursorDisplay from '../../components/ExpressionWithCursorDisplay';
import { getLogicalCursorLeft, getLogicalCursorRight, getBackspaceDeletionRange, FRAC_INSERT_CURSOR_OFFSET } from '../../utils/cursorNavigation';
import { getSkillFromQuestion } from '../assessment/getSkillFromQuestion';
import { getFormulasForQuestion } from '../../utils/formulaHints';
import type { SkillKey } from '../assessment/types';

const SKILL_ICON: Record<SkillKey, string> = {
  arithmetic: '🧮',
  equations: '⚖️',
  logarithms: '📈',
  trigonometry: '📐',
};

interface DailyChallengeScreenProps {
  session: DailyChallengeSession;
  onComplete: (session: DailyChallengeSession) => void;
}

const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ session, onComplete }) => {
  const { t } = useLocalization();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>(['']);
  const [cursorIndices, setCursorIndices] = useState<number[]>([0]);
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.challenge.timeLimit);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAdvancedKeyboard, setShowAdvancedKeyboard] = useState(false);
  const answersRef = useRef(session.answers);

  const currentQuestion = session.challenge.questions[currentIndex];
  const progress = (currentIndex / session.challenge.questions.length) * 100;
  const isSystemEquation = currentQuestion.question.includes('system{');
  const isQuadraticEquation = currentQuestion.question.includes('x^(2)') && !isSystemEquation;
  const numFields = isSystemEquation || isQuadraticEquation ? 2 : 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFinish = () => {
      const finalSession = {
          ...session,
          answers: answersRef.current,
          timeTaken: session.challenge.timeLimit - timeLeft,
      };
      onComplete(finalSession);
  };

  useEffect(() => {
    const n = (() => {
      const q = session.challenge.questions[currentIndex];
      if (!q) return 1;
      if (q.question.includes('system{')) return 2;
      if (q.question.includes('x^(2)') && !q.question.includes('system{')) return 2;
      return 1;
    })();
    setUserAnswers(Array(n).fill(''));
    setCursorIndices(Array(n).fill(0));
    setActiveFieldIndex(0);
    setShowHint(false);
  }, [currentIndex, session.challenge.questions]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        if (currentIndex < session.challenge.questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setFeedback(null);
        } else {
          handleFinish();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [feedback, currentIndex]);

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
    const cur = userAnswers[idx] ?? '';
    const cursorIndex = cursorIndices[idx] ?? 0;

    if (key === 'left') {
      setCursorIndices(prev => { const n = [...prev]; n[idx] = getLogicalCursorLeft(cur, cursorIndex); return n; });
    } else if (key === 'right') {
      setCursorIndices(prev => { const n = [...prev]; n[idx] = getLogicalCursorRight(cur, cursorIndex); return n; });
    } else if (key === 'backspace') {
      if (cursorIndex > 0) {
        const range = getBackspaceDeletionRange(cur, cursorIndex);
        if (range) {
          setUserAnswers(prev => { const n = [...prev]; n[idx] = cur.slice(0, range.start) + cur.slice(range.end); return n; });
          setCursorIndices(prev => { const n = [...prev]; n[idx] = range.start; return n; });
        } else {
          setUserAnswers(prev => { const n = [...prev]; n[idx] = cur.slice(0, cursorIndex - 1) + cur.slice(cursorIndex); return n; });
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

  const handleSubmit = () => {
    if (feedback) return;
    const hasInput = numFields === 2
      ? (userAnswers[0] ?? '').trim() && (userAnswers[1] ?? '').trim()
      : (userAnswers[0] ?? '').trim();
    if (!hasInput) return;

    let finalUserAnswer = '';
    if (isSystemEquation) {
      finalUserAnswer = `x=${(userAnswers[0] ?? '').trim()},y=${(userAnswers[1] ?? '').trim()}`;
    } else if (isQuadraticEquation) {
      finalUserAnswer = `${(userAnswers[0] ?? '').trim()},${(userAnswers[1] ?? '').trim()}`;
    } else {
      finalUserAnswer = (userAnswers[0] ?? '').trim();
    }
    const normalizeSegment = (s: string) => {
      let out = s.replace(/\s*x\s*=\s*/gi, '').replace(/\s*y\s*=\s*/gi, '').trim();
      out = out.replace(/frac\s*\{\s*([^{}]*)\s*\}\s*\{\s*([^{}]*)\s*\}/gi, (_, num: string, den: string) => `${num.trim()}/${den.trim()}`);
      out = out.replace(/\s*\/\s*/g, '/');
      out = out.replace(/(?:\u221A|√)\s*\[\s*2\s*\]\s*\(([^)]*)\)/g, 'sqrt($1)');
      out = out.replace(/sqrt\s*\[\s*2\s*\]\s*\(([^)]*)\)/g, 'sqrt($1)');
      out = out.replace(/\u221A/g, 'sqrt').replace(/√/g, 'sqrt');
      out = out.replace(/sqrt(\d+)(?!\()/g, (_, d: string) => `sqrt(${d})`);
      return out.toLowerCase().replace(/\s/g, '');
    };
    const normalizeAnswer = (str: string) => {
      const s = str.replace(/\s/g, ' ').trim().toLowerCase().replace(/x\s*=\s*/g, '').replace(/y\s*=\s*/g, '');
      return s.split(',').map(part => normalizeSegment(part)).filter(Boolean).sort().join(',');
    };
    const userNorm = normalizeAnswer(finalUserAnswer);
    const expectedNorm = normalizeAnswer(currentQuestion.answer);
    const acceptedNorms = [currentQuestion.answer, ...(currentQuestion.acceptedAnswers || [])].map(normalizeSegment);
    const isCorrect = currentQuestion.answer.includes(',')
      ? userNorm === expectedNorm
      : acceptedNorms.includes(userNorm) || userNorm === expectedNorm;
    answersRef.current.push({ question: currentQuestion, userAnswer: finalUserAnswer, isCorrect, hintUsed: showHint });
    setFeedback(isCorrect ? 'correct' : 'incorrect');
  };

  const handleSkip = () => {
    if (feedback) return;
    const userAnswer = numFields === 2
      ? `x=${(userAnswers[0] ?? '').trim() || '?'},y=${(userAnswers[1] ?? '').trim() || '?'}`
      : (userAnswers[0] ?? '').trim() || '—';
    answersRef.current.push({ question: currentQuestion, userAnswer, isCorrect: false, hintUsed: showHint });
    setShowHint(false);
    if (currentIndex < session.challenge.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
    } else {
      handleFinish();
    }
  };

  const handleHint = () => setShowHint(true);
  const hintSkill = getSkillFromQuestion(currentQuestion.question);
  const hintFormulas = getFormulasForQuestion(currentQuestion.question, hintSkill, { difficulty: currentQuestion.difficulty });

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const feedbackGlow = feedback === 'correct' ? 'shadow-[0_0_30px_10px_rgba(34,197,94,0.3)]' : feedback === 'incorrect' ? 'shadow-[0_0_30px_10px_rgba(239,68,68,0.3)]' : '';

  const isSubmitDisabled = numFields === 2
    ? (!(userAnswers[0] ?? '').trim() || !(userAnswers[1] ?? '').trim())
    : !(userAnswers[0] ?? '').trim();

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white">
      <header className="p-4 pt-safe">
        <div className="flex justify-between items-center text-sm font-bold text-gray-400">
          <span>⏳ {t('challenge.timer')}: <span className="text-white font-mono">{formatTime(timeLeft)}</span></span>
          <span>{t('challenge.progress')}: {currentIndex + 1}/{session.challenge.questions.length}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
          <div className="bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-6 -mt-10 min-w-0 overflow-y-auto">
        <div className="flex items-center gap-2 w-full max-w-md mb-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 border border-white/10">
            <span>{SKILL_ICON[getSkillFromQuestion(currentQuestion.question)]}</span>
            <span>{t(`dashboard.skill_${getSkillFromQuestion(currentQuestion.question)}`)}</span>
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 border border-white/10 tabular-nums">
            {t('challenge.tier')} {currentQuestion.difficulty}
          </span>
        </div>
        <div className={`relative bg-[rgba(18,24,38,0.7)] backdrop-blur-xl rounded-[28px] py-4 px-5 border border-white/10 w-full max-w-md min-h-[88px] max-h-[220px] flex items-center justify-center overflow-hidden transition-shadow duration-500 ${feedbackGlow}`}>
          <div className="animate-in fade-in zoom-in-95 duration-500 w-full min-w-0 overflow-auto scrollbar-hide py-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-center leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>
              <MathRenderer expression={currentQuestion.question} displayMode={true} />
            </h2>
          </div>
        </div>
      </main>

      {/* Всплывающее окно подсказки с формулами — перекрывает калькулятор */}
      {showHint && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowHint(false)}
          onKeyDown={e => e.key === 'Escape' && setShowHint(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-dialog-title"
            className="relative w-full max-w-sm max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
            style={{
              background: 'rgba(18, 24, 38, 0.97)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 40px rgba(91, 140, 255, 0.2), 0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span id="hint-dialog-title" className="flex items-center gap-2 text-sm font-bold text-[#E6E9F2]">
                💡 {t('challenge.hint')} — {SKILL_ICON[hintSkill]} {t(`dashboard.skill_${hintSkill}`)}
              </span>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="p-2 -m-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-52px)] py-4 px-4 space-y-4">
              <p className="text-xs text-[#9AA3B2]">{t('challenge.hint_text') || 'Упрости обе части уравнения или подставь известные значения.'}</p>
              {hintFormulas.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-[#5B8CFF] uppercase tracking-wider">Формулы</p>
                  {hintFormulas.map((item, i) => {
                    const lines = (typeof item.expr === 'string' ? item.expr : String(item.expr ?? '')).split(/\s*\|\s*/).filter(Boolean);
                    return (
                      <div key={i} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 space-y-1">
                        {lines.map((line, j) => (
                          <div key={j} className="min-w-0 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <MathRenderer expression={line.trim()} displayMode className="text-base" />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="p-4 pb-safe flex flex-col">
        {feedback ? (
            <div className="h-14 flex items-center justify-center animate-in fade-in duration-300">
                {feedback === 'correct' ? (
                    <p className="text-xl font-bold text-green-400">{t('challenge.feedback_correct')} +{Math.round(session.challenge.reward / session.challenge.questions.length)} XP</p>
                ) : (
                    <p className="text-lg font-semibold text-red-400">{t('challenge.feedback_incorrect')}</p>
                )}
            </div>
        ) : (
          <>
            <div className={`w-full max-w-md mx-auto mb-2 flex gap-3 ${numFields > 1 ? 'flex-row' : 'flex-col'}`}>
              {Array.from({ length: numFields }).map((_, fieldIdx) => (
                <div key={fieldIdx} className={`flex flex-col gap-1 ${numFields > 1 ? 'flex-1 min-w-0' : ''}`}>
                  {numFields > 1 && (
                    <span className="text-xs font-medium text-white/60">
                      {isSystemEquation ? (fieldIdx === 0 ? 'x' : 'y') : fieldIdx === 0 ? 'x₁' : 'x₂'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveFieldIndex(fieldIdx)}
                    className={`w-full min-h-[72px] text-left rounded-xl p-3 bg-[#1a1a24]/50 border border-white/10 flex flex-col justify-end transition-all ${activeFieldIndex === fieldIdx ? 'ring-2 ring-[#5B8CFF] ring-offset-2 ring-offset-[#0B0F1A]' : ''}`}
                  >
                    <div className="min-h-[56px] text-xl text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-2">
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
            <div className="max-w-lg mx-auto w-full px-0">
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
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={handleSkip} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#9AA3B2] bg-white/5 border border-white/10 active:scale-95">
                {t('challenge.skip')}
              </button>
              <button type="button" onClick={handleHint} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#9AA3B2] bg-white/5 border border-white/10 active:scale-95">
                💡 {t('challenge.hint')}
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
};

export default DailyChallengeScreen;
