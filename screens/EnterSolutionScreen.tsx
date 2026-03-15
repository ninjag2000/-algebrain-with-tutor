import React, { useState } from 'react';
import { HistoryItem } from '../types';
import CalculatorKeyboard from '../components/CalculatorKeyboard';
import AdvancedCalculatorKeyboard from '../components/AdvancedCalculatorKeyboard';
import { useLocalization } from '../contexts/LocalizationContext';
import SolutionLoadingScreen from '../components/SolutionLoadingScreen';
import MathRenderer from '../components/MathRenderer';
import { getBackspaceDeletionRange } from '../utils/cursorNavigation';

interface EnterSolutionScreenProps {
  item: HistoryItem;
  onBack: () => void;
  onVerificationComplete: (userAnswer: string) => void;
}

const EnterSolutionScreen: React.FC<EnterSolutionScreenProps> = ({ item, onBack, onVerificationComplete }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expression, setExpression] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const { t } = useLocalization();

  const handleKeyPress = (key: string) => {
    // This logic is a simplified version from ResultScreen.tsx
    let newExpression = expression;
    let newCursorPos = cursorPosition;

    switch (key) {
      case 'AC':
        newExpression = '';
        newCursorPos = 0;
        break;
      case 'backspace':
        if (cursorPosition > 0) {
          const range = getBackspaceDeletionRange(expression, cursorPosition);
          if (range) {
            newExpression = expression.slice(0, range.start) + expression.slice(range.end);
            newCursorPos = range.start;
          } else {
            newExpression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            newCursorPos = cursorPosition - 1;
          }
        }
        break;
      case 'left':
        newCursorPos = Math.max(0, cursorPosition - 1);
        break;
      case 'right':
        newCursorPos = Math.min(expression.length, cursorPosition + 1);
        break;
      case 'x²': newExpression = expression.slice(0, cursorPosition) + '^(2)' + expression.slice(cursorPosition); newCursorPos += 3; break;
      case 'xⁿ': newExpression = expression.slice(0, cursorPosition) + '^()' + expression.slice(cursorPosition); newCursorPos += 2; break;
      case '√': newExpression = expression.slice(0, cursorPosition) + '√()' + expression.slice(cursorPosition); newCursorPos += 2; break;
      case 'a/b': newExpression = expression.slice(0, cursorPosition) + 'frac{}{}' + expression.slice(cursorPosition); newCursorPos += 5; break;
      case ')': {
        const isClosingParenOfExponent = (pos: number) => {
          if (pos < 0 || expression[pos] !== ')') return false;
          let depth = 0;
          for (let i = pos; i >= 0; i--) {
            if (expression[i] === ')') depth++;
            else if (expression[i] === '(') {
              depth--;
              if (depth === 0) return i > 0 && expression[i - 1] === '^';
            }
          }
          return false;
        };
        const charAfter = expression[cursorPosition];
        const charBefore = cursorPosition > 0 ? expression[cursorPosition - 1] : undefined;
        if (charAfter === ')' && isClosingParenOfExponent(cursorPosition)) {
          newCursorPos = cursorPosition + 1;
          break;
        }
        if (charBefore === ')' && isClosingParenOfExponent(cursorPosition - 1)) {
          newCursorPos = cursorPosition;
          break;
        }
        newExpression = expression.slice(0, cursorPosition) + key + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + key.length;
        break;
      }
      default:
        newExpression = expression.slice(0, cursorPosition) + key + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + key.length;
        break;
    }
    setExpression(newExpression);
    setCursorPosition(newCursorPos);
  };

  const handleVerify = () => {
    if (!expression.trim() || isVerifying) return;
    setIsVerifying(true);
    // The actual API call is handled in App.tsx to manage navigation
    onVerificationComplete(expression);
  };
  
  const renderExpressionWithCursor = () => {
    if (expression.length === 0 && cursorPosition === 0) {
      return <span className="inline-block w-0.5 h-8 bg-blue-400 animate-pulse align-middle"></span>;
    }
    const before = expression.slice(0, cursorPosition);
    const after = expression.slice(cursorPosition);
    return (
        <>
            <MathRenderer expression={before} />
            <span className="inline-block w-0.5 h-8 bg-blue-400 animate-pulse align-middle"></span>
            <MathRenderer expression={after} />
        </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F1A] text-white relative overflow-hidden">
      <SolutionLoadingScreen isVisible={isVerifying} />

      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('scan.checkMyAnswer')}</h1>
          <div className="w-10"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>
      
      <main className="flex-1 flex flex-col justify-end overflow-hidden">
        <div className="p-4 space-y-4">
            <div className="bg-[#121826] p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-[#5B8CFF] uppercase tracking-[0.3em] mb-3">Problem</p>
                <div className="text-xl font-bold text-white text-center py-2 overflow-x-auto scrollbar-hide">
                    <MathRenderer expression={item.problem} displayMode={true} />
                </div>
            </div>
            
            <div className="bg-[#1A1D24] p-5 rounded-2xl border border-white/10 min-h-[120px] flex flex-col justify-end">
                <p className="text-xs font-bold text-gray-400 mb-2">{t('solution.verification.prompt')}</p>
                <div className="text-3xl text-right overflow-x-auto scrollbar-hide break-all">
                    {renderExpressionWithCursor()}
                </div>
            </div>
        </div>
      </main>

      <div className="bg-[#121826] p-2 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-[2]" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        {showAdvanced ? (
          <AdvancedCalculatorKeyboard onKeyPress={handleKeyPress} toggleKeyboard={() => setShowAdvanced(false)} onCalculate={handleVerify} isCalculating={isVerifying} />
        ) : (
          <CalculatorKeyboard onKeyPress={handleKeyPress} toggleKeyboard={() => setShowAdvanced(true)} onCalculate={handleVerify} isCalculating={isVerifying} />
        )}
      </div>
    </div>
  );
};

export default EnterSolutionScreen;