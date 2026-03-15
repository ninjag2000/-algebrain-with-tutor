import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { CalculationResult } from '../types';
import CalculatorKeyboard from '../components/CalculatorKeyboard';
import AdvancedCalculatorKeyboard from '../components/AdvancedCalculatorKeyboard';
import { solveMathProblemFromText } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import SolutionLoadingScreen from '../components/SolutionLoadingScreen';
import MathRenderer from '../components/MathRenderer';
import ExpressionWithCursorDisplay from '../components/ExpressionWithCursorDisplay';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';
import { getLogicalCursorLeft, getLogicalCursorRight } from '../utils/cursorNavigation';

interface ResultScreenProps {
  result: CalculationResult;
  onBack: () => void;
  onCalculationComplete: (problem: string, solution: string) => void;
  solveCount: number;
  onOpenPaywall: () => void;
  freeSolveLimit: number;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ result, onBack, onCalculationComplete, solveCount, onOpenPaywall, freeSolveLimit }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expression, setExpression] = useState(result.problem);
  const [cursorPosition, setCursorPosition] = useState(result.problem.length);
  const [isCalculating, setIsCalculating] = useState(false);
  const { t, language } = useLocalization();

  useEffect(() => {
    setExpression(result.problem);
    setCursorPosition(result.problem.length);
  }, [result.problem]);

  const handleKeyPress = (key: string) => {
    const specialPartRegex = /(\^\(.*?\)|√\[.*?\]\(.*?\)|√\(.*?\)|frac\{.*?\}\{.*?\}|system\{.*?\}|mixfrac\{.*?\}\{.*?\}\{.*?\})/g;

    if (key === 'left') {
        const logBlocks = getLogBlocks();
        for (const block of logBlocks) {
          if (cursorPosition > block.start && cursorPosition <= block.end) {
            setCursorPosition(block.start);
            return;
          }
        }
        const rootBlocks = getRootBlocks();
        for (const r of rootBlocks) {
          if (cursorPosition === r.radicandEnd + 2) {
            setCursorPosition(r.radicandEnd + 1);
            return;
          }
          if (cursorPosition === r.radicandEnd + 1) {
            setCursorPosition(r.degreeIs2or3 ? r.rootStart : r.radicandStart);
            return;
          }
          if (cursorPosition === r.degreeEnd + 1) {
            setCursorPosition(r.rootStart);
            return;
          }
          if (r.degreeIs2or3 && cursorPosition === r.rootStart + 1) {
            setCursorPosition(r.rootStart);
            return;
          }
          if (r.degreeIs2or3 && cursorPosition > r.degreeEnd && cursorPosition < r.radicandStart) {
            setCursorPosition(r.rootStart);
            return;
          }
          if (cursorPosition === r.radicandStart - 1) {
            setCursorPosition(r.degreeIs2or3 ? r.rootStart : (r.degreeEnd >= r.degreeStart ? r.degreeEnd : r.degreeStart));
            return;
          }
          if (!r.degreeIs2or3 && cursorPosition === r.degreeStart) {
            setCursorPosition(r.rootStart);
            return;
          }
          if (cursorPosition === r.radicandStart) {
            const hasPosAfterSqrt = r.radicandStart > r.rootStart + 1;
            setCursorPosition(r.degreeIs2or3 && hasPosAfterSqrt ? r.radicandStart - 1 : (r.degreeEnd >= r.degreeStart ? r.degreeEnd : r.degreeStart));
            return;
          }
          if (r.degreeIs2or3 && cursorPosition >= r.degreeStart && cursorPosition <= r.degreeEnd) {
            setCursorPosition(r.rootStart);
            return;
          }
          if (cursorPosition > r.radicandStart && cursorPosition <= r.radicandEnd) {
            setCursorPosition(cursorPosition - 1);
            return;
          }
        }
        const blocks = getExponentBlocks();
        for (const b of blocks) {
          if (cursorPosition >= b.contentStart && cursorPosition <= b.contentEnd + 1) {
            setCursorPosition(b.expStart);
            return;
          }
        }
        const prevChars = expression.substring(cursorPosition - 2, cursorPosition);
        if (prevChars === '}{') {
            setCursorPosition(cursorPosition - 2);
            return;
        }
        if (expression[cursorPosition - 1] === '(') {
            const parts = expression.split(specialPartRegex);
            let processedLength = 0;
            for (const part of parts) {
                if (!part) continue;
                const partStart = processedLength;
                if (part.startsWith('√[') && (partStart + part.indexOf('(') === cursorPosition - 1)) {
                    const degreeMatch = part.match(/√\[(.*?)]/);
                    const degree = degreeMatch ? degreeMatch[1] : '';
                    const degreeEndPos = partStart + 2 + degree.length;
                    setCursorPosition(degreeEndPos);
                    return;
                }
                processedLength += part.length;
            }
        }
        const prevPos = Math.max(0, cursorPosition - 1);
        if (isLeadingRootBadPosition(prevPos)) {
          setCursorPosition(0);
          return;
        }
        const coeffSegsLeft = getCoeffRootSegments();
        for (const s of coeffSegsLeft) {
          if (cursorPosition === s.radicandEnd + 2) {
            setCursorPosition(s.radicandEnd + 1);
            return;
          }
          if (cursorPosition === s.radicandEnd + 1) {
            setCursorPosition(s.radicandStart);
            return;
          }
          if (cursorPosition === s.radicandStart) {
            setCursorPosition(s.forbiddenPosition);
            return;
          }
          if (s.forbiddenPosition === prevPos) {
            setCursorPosition(s.coefficientStart);
            return;
          }
        }
        const rootBlocksNoDegree = getRootBlocks();
        for (const r of rootBlocksNoDegree) {
          if (r.degreeIs2or3 && prevPos >= r.rootStart + 1 && prevPos <= r.degreeEnd) {
            setCursorPosition(r.rootStart);
            return;
          }
        }
        const funcNamesLeft = ['arcsin', 'arccos', 'arctan', 'arcctg', 'sin', 'cos', 'tan', 'ctg', 'log', 'ln', 'lg'];
        for (const name of funcNamesLeft) {
          if (cursorPosition >= name.length && expression.slice(cursorPosition - name.length, cursorPosition) === name) {
            setCursorPosition(cursorPosition - name.length);
            return;
            }
        }
        setCursorPosition(getLogicalCursorLeft(expression, cursorPosition));
        return;
    }

    if (key === 'right') {
        const logBlocksRight = getLogBlocks();
        for (const block of logBlocksRight) {
          if (cursorPosition === block.start) {
            setCursorPosition(block.start + 4);
            return;
          }
        }
        const rootBlocksRight = getRootBlocks();
        for (const r of rootBlocksRight) {
          if (cursorPosition === r.rootStart) {
            setCursorPosition(r.degreeIs2or3 ? r.radicandStart : r.degreeStart);
            return;
          }
        }
        const coeffSegsRight = getCoeffRootSegments();
        for (const s of coeffSegsRight) {
          const afterOperator = s.coefficientStart > 0 && (expression[s.coefficientStart - 1] === '+' || expression[s.coefficientStart - 1] === '-');
          if (cursorPosition === s.coefficientStart && s.coefficientEnd > s.coefficientStart && afterOperator) {
            setCursorPosition(s.radicandStart);
            return;
          }
          if (cursorPosition === s.forbiddenPosition) {
            const rootAtSqrt = rootBlocksRight.find(r => r.rootStart === s.forbiddenPosition && r.degreeEnd >= r.degreeStart && !r.degreeIs2or3);
            if (rootAtSqrt) {
              setCursorPosition(rootAtSqrt.degreeStart);
              return;
            }
            setCursorPosition(s.radicandStart);
            return;
          }
        }
        const rootBlocks = rootBlocksRight;
        for (const r of rootBlocks) {
          if (cursorPosition === r.radicandStart) {
            setCursorPosition(Math.min(r.radicandStart + 1, r.radicandEnd + 1));
            return;
          }
          if (cursorPosition === r.radicandEnd + 1) {
            setCursorPosition(r.radicandEnd + 2);
            return;
          }
          if (r.degreeIs2or3 && cursorPosition === r.degreeStart - 1) {
            setCursorPosition(r.radicandStart);
            return;
          }
          const inDegree = cursorPosition >= r.degreeStart && cursorPosition <= r.degreeEnd;
          const atDegreeStartWhenEmpty = r.degreeEnd < r.degreeStart && cursorPosition === r.degreeStart;
          const onClosingBracket = cursorPosition === r.degreeEnd + 1;
          if (r.degreeIs2or3 && inDegree) {
            setCursorPosition(r.radicandStart);
            return;
          }
          if (onClosingBracket || cursorPosition === r.radicandStart - 1) {
            setCursorPosition(r.radicandStart);
            return;
          }
          if (atDegreeStartWhenEmpty) {
            setCursorPosition(r.radicandStart);
            return;
          }
          if (!r.degreeIs2or3 && inDegree) {
            setCursorPosition(cursorPosition + 1);
            return;
          }
        }
        const blocks = getExponentBlocks();
        for (const b of blocks) {
          if (cursorPosition >= b.expStart && cursorPosition < b.contentStart) {
            setCursorPosition(b.contentEnd + 1);
            return;
          }
          if (cursorPosition >= b.contentStart && cursorPosition <= b.contentEnd) {
            setCursorPosition(b.contentEnd + 1);
            return;
          }
          if (cursorPosition === b.contentEnd + 1) {
            setCursorPosition(b.contentEnd + 2);
            return;
          }
        }
        const nextChars = expression.substring(cursorPosition, cursorPosition + 2);
        if (nextChars === '}{') {
            setCursorPosition(cursorPosition + 2);
            return;
        }
        if (expression[cursorPosition] === ']') {
            const parts = expression.split(specialPartRegex);
            let processedLength = 0;
            for (const part of parts) {
                if (!part) continue;
                const partStart = processedLength;
                if (part.startsWith('√[') && (partStart + part.indexOf(']') === cursorPosition)) {
                    const radicandStartPos = partStart + part.indexOf('(') + 1;
                    setCursorPosition(radicandStartPos);
                    return;
                }
                processedLength += part.length;
            }
        }
        if (expression[cursorPosition] === ')' || expression[cursorPosition] === '}') {
            const parts = expression.split(specialPartRegex);
            let processedLength = 0;
            for (const part of parts) {
                if (!part) continue;
                const partStart = processedLength;
                const partEnd = partStart + part.length;
                if ((part.startsWith('√(') || part.startsWith('^(') || part.startsWith('√[') || part.startsWith('frac{') || part.startsWith('system{') || part.startsWith('mixfrac{')) && (partEnd - 1 === cursorPosition)) {
                    const newExpression = expression.slice(0, partEnd) + ' ' + expression.slice(partEnd);
                    setExpression(newExpression);
                    setCursorPosition(partEnd + 1);
                    return;
                }
                processedLength = partEnd;
            }
        }
    const nextPos = getLogicalCursorRight(expression, cursorPosition);
    if (isLeadingRootBadPosition(nextPos)) {
      const seg = getLeadingRootSegment();
      if (seg) setCursorPosition(seg.radicandEnd + 1);
      return;
    }
    const coeffSegs = getCoeffRootSegments();
    for (const _s of coeffSegs) {
      // Не прыгаем через позицию «сразу после коэффициента» — разрешаем курсор там
    }
    const rootBlocksSkip = getRootBlocks();
    for (const r of rootBlocksSkip) {
      if (r.degreeIs2or3 && nextPos >= r.degreeStart && nextPos <= r.degreeEnd + 1) {
        setCursorPosition(r.radicandStart);
        return;
      }
    }
    const funcNamesRight = ['arcsin', 'arccos', 'arctan', 'arcctg', 'sin', 'cos', 'tan', 'ctg', 'log', 'ln', 'lg'];
    for (const name of funcNamesRight) {
      if (cursorPosition + name.length <= expression.length && expression.slice(cursorPosition, cursorPosition + name.length) === name) {
        setCursorPosition(cursorPosition + name.length);
        return;
      }
    }
        setCursorPosition(nextPos);
        return;
    }

    let newExpression = expression;
    let newCursorPos = cursorPosition;

    switch (key) {
      case 'AC':
        newExpression = '';
        newCursorPos = 0;
        break;
      case 'backspace':
        if (cursorPosition > 0) {
            let specialPartDeleted = false;
            const parts = expression.split(specialPartRegex);
            let processedLength = 0;
            const isSpecialPart = /^(\^\(.*?\)|√\[.*?\]\(.*?\)|√\(.*?\)|frac\{.*?\}\{.*?\}|system\{.*?\}|mixfrac\{.*?\}\{.*?\}\{.*?\})$/;
            for (const part of parts) {
                if (!part) continue;
                const partStart = processedLength;
                const partEnd = partStart + part.length;
                const cursorInsidePart = cursorPosition > partStart && cursorPosition <= partEnd;
                const cursorRightAfterPart = partEnd === cursorPosition;
                if ((cursorRightAfterPart || cursorInsidePart) && isSpecialPart.test(part)) {
                    newExpression = expression.slice(0, partStart) + expression.slice(partEnd);
                    newCursorPos = partStart;
                    specialPartDeleted = true;
                    break;
                }
                processedLength += part.length;
            }
            if (!specialPartDeleted) {
                const trigNames = ['arcsin', 'arccos', 'arctan', 'arcctg', 'sin', 'cos', 'tan', 'ctg'];
                const logNames = ['log', 'ln', 'lg'];
                let funcDeleted = false;
                for (const name of [...trigNames, ...logNames]) {
                    if (cursorPosition >= name.length && expression.slice(cursorPosition - name.length, cursorPosition) === name) {
                        newExpression = expression.slice(0, cursorPosition - name.length) + expression.slice(cursorPosition);
                        newCursorPos = cursorPosition - name.length;
                        funcDeleted = true;
                        break;
                    }
                }
                if (!funcDeleted) {
                    const twoBefore = cursorPosition >= 2 ? expression.slice(cursorPosition - 2, cursorPosition) : '';
                    if (twoBefore === '>=' || twoBefore === '<=') {
                        newExpression = expression.slice(0, cursorPosition - 2) + expression.slice(cursorPosition);
                        newCursorPos = cursorPosition - 2;
                    } else {
                newExpression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
                newCursorPos = cursorPosition - 1;
                    }
                }
            }
        }
        break;
      case 'system':
        const systemTemplate = 'system{;}';
        newExpression = expression.slice(0, cursorPosition) + systemTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 7;
        break;
      case 'a/b':
        const fractionTemplate = 'frac{}{}';
        newExpression = expression.slice(0, cursorPosition) + fractionTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 5;
        break;
      case 'mixfrac':
        const mixFracTemplate = 'mixfrac{}{}{}';
        newExpression = expression.slice(0, cursorPosition) + mixFracTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 8;
        break;
      case 'log': {
        const logTemplate = 'log[]()';
        newExpression = expression.slice(0, cursorPosition) + logTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 4;
        break;
      }
      case 'x²':
        const squareTemplate = '^(2)';
        newExpression = expression.slice(0, cursorPosition) + squareTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + squareTemplate.length;
        break;
      case 'x³':
        const cubeTemplate = '^(3)';
        newExpression = expression.slice(0, cursorPosition) + cubeTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + cubeTemplate.length;
        break;
      case 'xⁿ':
        const powerTemplate = '^()';
        newExpression = expression.slice(0, cursorPosition) + powerTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 2;
        break;
      case '√':
        const sqrtTemplate = '√()';
        newExpression = expression.slice(0, cursorPosition) + sqrtTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 2;
        break;
      case '³√':
        const cbrtTemplate = '√[3]()';
        newExpression = expression.slice(0, cursorPosition) + cbrtTemplate + expression.slice(cursorPosition);
        newCursorPos = cursorPosition + 5;
        break;
      case 'ⁿ√': {
        const prev = cursorPosition > 0 ? expression[cursorPosition - 1] : '';
        const isPrevSqrt = prev === '√' || (prev !== '' && prev.charCodeAt(0) === 0x221A);
        if (isPrevSqrt) {
          newExpression = expression.slice(0, cursorPosition) + '[]()' + expression.slice(cursorPosition);
          newCursorPos = cursorPosition + 3;
        } else {
          newExpression = expression.slice(0, cursorPosition) + '√[]()' + expression.slice(cursorPosition);
          newCursorPos = cursorPosition + 4;
        }
        break;
      }
      case ')': {
        const isClosingParenOfExponent = (pos: number) => {
          if (pos < 0 || (expression[pos] !== ')' && expression[pos] !== '\uFF09')) return false;
          let depth = 0;
          for (let i = pos; i >= 0; i--) {
            const c = expression[i];
            if (c === ')' || c === '\uFF09') depth++;
            else if (c === '(' || c === '\uFF08') {
              depth--;
              if (depth === 0) {
                let k = i - 1;
                while (k >= 0 && expression[k] === ' ') k--;
                return k >= 0 && (expression[k] === '^' || expression[k] === '\uFF3E' || (expression[k] && expression[k].charCodeAt(0) === 0x5E));
              }
            }
          }
          return false;
        };
        const charAfter = expression[cursorPosition];
        const charBefore = cursorPosition > 0 ? expression[cursorPosition - 1] : undefined;
        // Курсор перед закрывающей ) степени — только сдвинуть курсор, не вставлять
        if (charAfter === ')' && isClosingParenOfExponent(cursorPosition)) {
          setCursorPosition(cursorPosition + 1);
          return;
        }
        // Курсор сразу после закрывающей ) степени — не вставлять лишнюю )
        if (charBefore === ')' && isClosingParenOfExponent(cursorPosition - 1)) {
          return;
        }
        // Доп. проверка по блокам степени: курсор сразу после contentEnd (после закрывающей )) — не вставлять
        const blocks = getExponentBlocks();
        for (const b of blocks) {
          const closingParenPos = b.contentEnd + 1;
          if (cursorPosition === closingParenPos + 1 && expression[cursorPosition - 1] === ')') {
            return;
          }
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

  const handleCalculate = async () => {
    if (!expression.trim() || isCalculating) return;

    if (solveCount >= freeSolveLimit) {
      onOpenPaywall();
      return;
    }

    setIsCalculating(true);
    const startTime = Date.now();
    try {
        const newSolution = await solveMathProblemFromText(expression, language);
        const elapsedTime = Date.now() - startTime;
        const delay = 1000 - elapsedTime; // Minimum 1s
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        const translatedSolution = newSolution.startsWith('error.') ? t(newSolution) : newSolution;
        onCalculationComplete(expression, translatedSolution);
    } catch (error) {
        console.error("Calculation error:", error);
        const errorMessage = t("error.solutionFailText");
        onCalculationComplete(expression, errorMessage);
    } finally {
        setIsCalculating(false);
    }
  };

  const handleExample = () => {
    const exampleExpr = 'x^(2) + 5x + 6 = 0';
    setExpression(exampleExpr);
    setCursorPosition(exampleExpr.length);
  };

  // Floating formulas and UI elements for idle animation
  const floatingElements = useMemo(() => [
    { content: '+', class: 'top-1/4 left-1/4 text-2xl opacity-10 animate-float' },
    { content: '×', class: 'top-1/3 right-1/4 text-xl opacity-15 animate-float-delay-1' },
    { content: '=', class: 'bottom-1/3 left-1/4 text-2xl opacity-10 animate-float-delay-2' },
    { content: '÷', class: 'bottom-1/4 right-1/4 text-xl opacity-15 animate-float-delay-3' },
  ], []);

  const openParenChar = (c: string) => c === '(' || c === '\uFF08';
  const isExponentStart = (idx: number) => {
    const ch = expression[idx];
    const isCaret = ch === '^' || ch === '\uFF3E' || (ch != null && ch.charCodeAt(0) === 0x5E);
    if (!isCaret) return false;
    let p = idx + 1;
    while (p < expression.length && expression[p] === ' ') p++;
    return p < expression.length && openParenChar(expression[p]);
  };
  const exponentContentStart = (idx: number) => {
    let p = idx + 1;
    while (p < expression.length && expression[p] === ' ') p++;
    return openParenChar(expression[p]) ? p + 1 : idx + 2;
  };
  const findNextExponent = (from: number) => {
    for (let k = from; k < expression.length; k++) {
      if (isExponentStart(k)) return k;
    }
    return -1;
  };

  /** Выражение начинается с √ (напр. √2 или √(2)). Позиции от afterSqrt до radicandStart (и при √2 сама radicandStart) визуально «перед корнем», но одна из них ломает ввод — не даём туда попадать. */
  const getLeadingRootSegment = (): { afterSqrt: number; radicandStart: number; radicandEnd: number } | null => {
    if (expression.length < 2) return null;
    const isSqrt = (c: string) => c === '√' || (c !== '' && c.charCodeAt(0) === 0x221A);
    const openP = (c: string) => c === '(' || c === '\uFF08';
    const closeP = (c: string) => c === ')' || c === '\uFF09';
    let i = 0;
    while (i < expression.length && expression[i] === ' ') i++;
    if (i >= expression.length || !isSqrt(expression[i])) return null;
    const afterSqrt = i + 1;
    if (afterSqrt >= expression.length) return null;
    if (openP(expression[afterSqrt])) {
      let depth = 1, q = afterSqrt + 1;
      while (q < expression.length && depth > 0) {
        if (openP(expression[q])) depth++;
        else if (closeP(expression[q])) depth--;
        q++;
      }
      return { afterSqrt, radicandStart: afterSqrt + 1, radicandEnd: depth === 0 ? q - 2 : afterSqrt };
    }
    if (/[\d.]/.test(expression[afterSqrt])) {
      let radEnd = afterSqrt;
      while (radEnd + 1 < expression.length && /[\d.]/.test(expression[radEnd + 1])) radEnd++;
      return { afterSqrt, radicandStart: afterSqrt, radicandEnd: radEnd };
    }
    return null;
  };

  const isLeadingRootBadPosition = (pos: number): boolean => {
    const seg = getLeadingRootSegment();
    if (!seg) return false;
    const inGap = pos >= seg.afterSqrt && pos < seg.radicandStart;
    const ambiguousStart = seg.radicandStart === seg.afterSqrt && pos === seg.radicandStart;
    return inGap || ambiguousStart;
  };

  /** Участки "коэффициент√..." (напр. 2√2 или 2√(2)). Курсор не должен останавливаться между коэффициентом и √. */
  const getCoeffRootSegments = (): { coefficientStart: number; coefficientEnd: number; forbiddenPosition: number; radicandStart: number; radicandEnd: number }[] => {
    const segments: { coefficientStart: number; coefficientEnd: number; forbiddenPosition: number; radicandStart: number; radicandEnd: number }[] = [];
    const isSqrt = (c: string) => c === '√' || (c !== '' && c.charCodeAt(0) === 0x221A);
    const openP = (c: string) => c === '(' || c === '\uFF08';
    const closeP = (c: string) => c === ')' || c === '\uFF09';
    let i = 0;
    while (i < expression.length) {
      if (!/[\d.]/.test(expression[i])) { i++; continue; }
      const coStart = i;
      let coEnd = i;
      while (coEnd + 1 < expression.length && /[\d.]/.test(expression[coEnd + 1])) coEnd++;
      if (coEnd + 1 >= expression.length) { i = coEnd + 1; continue; }
      if (!isSqrt(expression[coEnd + 1])) { i = coEnd + 1; continue; }
      const sqrtPos = coEnd + 1;
      const afterSqrt = coEnd + 2;
      if (afterSqrt >= expression.length) { i = coEnd + 1; continue; }
      const nextCh = expression[afterSqrt];
      let radicandStart: number;
      let radicandEnd: number;
      const isBracket = (c: string) => c === '[' || c === '\uFF3B';
      const isBracketClose = (c: string) => c === ']' || c === '\uFF3D';
      if (isBracket(nextCh)) {
        let depth = 1, p = afterSqrt + 1;
        while (p < expression.length && depth > 0) {
          if (isBracket(expression[p])) depth++;
          else if (isBracketClose(expression[p])) depth--;
          p++;
        }
        if (depth !== 0) { i = coEnd + 1; continue; }
        while (p < expression.length && (expression[p] === ' ' || isSqrt(expression[p]))) p++;
        if (p >= expression.length || !openP(expression[p])) { i = coEnd + 1; continue; }
        let depthP = 1, q = p + 1;
        while (q < expression.length && depthP > 0) {
          if (openP(expression[q])) depthP++;
          else if (closeP(expression[q])) depthP--;
          q++;
        }
        radicandStart = p + 1;
        radicandEnd = depthP === 0 ? q - 2 : p;
        i = q;
      } else if (openP(nextCh)) {
        let depth = 1, q = afterSqrt + 1;
        while (q < expression.length && depth > 0) {
          if (openP(expression[q])) depth++;
          else if (closeP(expression[q])) depth--;
          q++;
        }
        radicandStart = afterSqrt + 1;
        radicandEnd = depth === 0 ? q - 2 : afterSqrt;
        i = q;
      } else if (/[\d.]/.test(nextCh)) {
        radicandStart = afterSqrt;
        radicandEnd = afterSqrt;
        while (radicandEnd + 1 < expression.length && /[\d.]/.test(expression[radicandEnd + 1])) radicandEnd++;
        i = radicandEnd + 1;
      } else { i = coEnd + 1; continue; }
      segments.push({
        coefficientStart: coStart,
        coefficientEnd: coEnd,
        forbiddenPosition: sqrtPos,
        radicandStart,
        radicandEnd,
      });
    }
    return segments;
  };

  useLayoutEffect(() => {
    if (isLeadingRootBadPosition(cursorPosition)) {
      setCursorPosition(0);
      return;
    }
const segs = getCoeffRootSegments();
    for (const _s of segs) {
      // Позицию между коэффициентом и √ (forbiddenPosition) не сдвигаем — пользователь может ставить курсор «сразу после 3»
    }
    const rootBlocksSnap = getRootBlocks();
    for (const r of rootBlocksSnap) {
      if (r.degreeIs2or3 && cursorPosition >= r.degreeStart && cursorPosition <= r.degreeEnd + 1) {
        setCursorPosition(r.radicandStart);
        return;
      }
    }
  }, [cursorPosition, expression]);

  const getExponentBlocks = (): { expStart: number; contentStart: number; contentEnd: number }[] => {
    const blocks: { expStart: number; contentStart: number; contentEnd: number }[] = [];
    const openP = (c: string) => c === '(' || c === '\uFF08';
    const closeP = (c: string) => c === ')' || c === '\uFF09';
    const isCaretLike = (c: string) => c === '^' || c === '\uFF3E' || (c != null && c.charCodeAt(0) === 0x5E);
    let i = 0;
    while (i < expression.length) {
      let expStart = -1;
      let contentStart: number;
      if (isExponentStart(i)) {
        expStart = i;
        contentStart = exponentContentStart(i);
      } else {
        const openIdx = expression.indexOf('(', i);
        if (openIdx < 1) break;
        let back = openIdx - 1;
        while (back >= 0 && expression[back] === ' ') back--;
        const c = back >= 0 ? expression[back] : null;
        if (!isCaretLike(c!) && (c == null || /[\d.a-zA-Z]/.test(c))) { i++; continue; }
        expStart = back;
        contentStart = openIdx + 1;
        i = back;
      }
      let depth = 1;
      let j = contentStart;
      while (j < expression.length && depth > 0) {
        if (openP(expression[j])) depth++;
        else if (closeP(expression[j])) depth--;
        j++;
      }
      const contentEnd = j > 0 ? j - 2 : 0;
      blocks.push({ expStart, contentStart, contentEnd });
      i = j - 1;
      i++;
    }
    return blocks;
  };

  /** Блоки log[base](arg): при движении влево из аргумента или из основания — сразу перед "log". */
  const getLogBlocks = (): { start: number; end: number }[] => {
    const blocks: { start: number; end: number }[] = [];
    const openP = (c: string) => c === '(' || c === '\uFF08';
    const closeP = (c: string) => c === ')' || c === '\uFF09';
    let i = 0;
    while (i < expression.length) {
      if (i + 4 > expression.length || expression.substring(i, i + 4) !== 'log[') { i++; continue; }
      const baseStart = i + 4;
      let bracketEnd = baseStart;
      while (bracketEnd < expression.length && expression[bracketEnd] !== ']' && expression[bracketEnd] !== '\uFF3D') bracketEnd++;
      if (bracketEnd >= expression.length || (expression[bracketEnd] !== ']' && expression[bracketEnd] !== '\uFF3D')) { i++; continue; }
      const openParen = bracketEnd + 1;
      if (openParen >= expression.length || !openP(expression[openParen])) { i++; continue; }
      let depth = 1;
      let closeParen = openParen + 1;
      while (closeParen < expression.length && depth > 0) {
        if (openP(expression[closeParen])) depth++;
        else if (closeP(expression[closeParen])) depth--;
        closeParen++;
      }
      if (depth !== 0) { i++; continue; }
      blocks.push({ start: i, end: closeParen - 1 });
      i = closeParen;
    }
    return blocks;
  };

  /** Блоки корня ⁿ√: переход стрелкой из степени в подкоренное (и обратно) за 1 шаг. rootStart — индекс √. degreeIs2or3 — для ²√ и ³√ курсор в степень не заходит. */
  const getRootBlocks = (): { rootStart: number; degreeStart: number; degreeEnd: number; radicandStart: number; radicandEnd: number; degreeIs2or3: boolean }[] => {
    const blocks: { rootStart: number; degreeStart: number; degreeEnd: number; radicandStart: number; radicandEnd: number; degreeIs2or3: boolean }[] = [];
    const openP = (c: string) => c === '(' || c === '\uFF08';
    const closeP = (c: string) => c === ')' || c === '\uFF09';
    const isSqrtChar = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
    const parseBracketBlock = (from: number): { end: number } => {
      if (from >= expression.length || (expression[from] !== '[' && expression[from] !== '\uFF3B')) return { end: from };
      let d = 1, i = from + 1;
      while (i < expression.length && d > 0) {
        if (expression[i] === '[' || expression[i] === '\uFF3B') d++;
        else if (expression[i] === ']' || expression[i] === '\uFF3D') d--;
        i++;
      }
      return { end: d === 0 ? i : from };
    };
    let i = 0;
    while (i < expression.length) {
      if (!isSqrtChar(expression[i])) { i++; continue; }
      let p = i + 1;
      if (p < expression.length && isSqrtChar(expression[p])) p++;
      if (p >= expression.length || (expression[p] !== '[' && expression[p] !== '\uFF3B')) { i++; continue; }
      const br = parseBracketBlock(p);
      const bracketEnd = br.end;
      if (bracketEnd <= p || bracketEnd >= expression.length || (expression[bracketEnd - 1] !== ']' && expression[bracketEnd - 1] !== '\uFF3D')) { i++; continue; }
      const degreeStart = p + 1;
      const degreeEnd = bracketEnd - 2;
      p = bracketEnd;
      while (p < expression.length && (expression[p] === ' ' || isSqrtChar(expression[p]))) p++;
      if (p >= expression.length || !openP(expression[p])) { i++; continue; }
      let depth = 1;
      let q = p + 1;
      while (q < expression.length && depth > 0) {
        if (openP(expression[q])) depth++;
        else if (closeP(expression[q])) depth--;
        q++;
      }
      if (depth !== 0) { i++; continue; }
      const degreeContent = expression.substring(degreeStart, Math.max(degreeStart, degreeEnd + 1)).trim().replace(/\u00B2/g, '2').replace(/\u00B3/g, '3');
      const degreeIs2or3 = degreeContent === '2' || degreeContent === '3';
      blocks.push({ rootStart: i, degreeStart, degreeEnd, radicandStart: p + 1, radicandEnd: q - 2, degreeIs2or3 });
      i = q;
    }
    // Паттерн √(подкоренное) — квадратный корень без [] (напр. √(2) из шаблона √())
    let j = 0;
    while (j < expression.length) {
      if (!isSqrtChar(expression[j])) { j++; continue; }
      const afterSqrt = j + 1;
      if (afterSqrt >= expression.length || !openP(expression[afterSqrt])) { j++; continue; }
      let depth = 1;
      let q = afterSqrt + 1;
      while (q < expression.length && depth > 0) {
        if (openP(expression[q])) depth++;
        else if (closeP(expression[q])) depth--;
        q++;
      }
      if (depth !== 0) { j++; continue; }
      const radicandStart = afterSqrt + 1;
      const radicandEnd = q - 2;
      blocks.push({ rootStart: j, degreeStart: radicandStart, degreeEnd: radicandStart - 1, radicandStart, radicandEnd, degreeIs2or3: true });
      j = q;
    }
    // Паттерн "число]()√(подкоренное)" — степень перед скобками, переход за 1 шаг
    const legacyRootPattern = /[\]\uFF3D]\s*[(\（]\s*[)\）]\s*√/;
    let idx = 0;
    while (idx < expression.length) {
      const match = expression.slice(idx).match(legacyRootPattern);
      if (!match) break;
      const bracketIdx = idx + match.index!;
      const afterRoot = bracketIdx + match[0].length;
      if (afterRoot >= expression.length || (expression[afterRoot] !== '(' && expression[afterRoot] !== '\uFF08')) { idx = bracketIdx + 1; continue; }
      let depth = 1, closeIdx = afterRoot + 1;
      while (closeIdx < expression.length && depth > 0) {
        if (expression[closeIdx] === '(' || expression[closeIdx] === '\uFF08') depth++;
        else if (expression[closeIdx] === ')' || expression[closeIdx] === '\uFF09') depth--;
        closeIdx++;
      }
      if (depth !== 0) { idx = bracketIdx + 1; continue; }
      let degreeEnd = bracketIdx - 1;
      let degreeStart = degreeEnd + 1;
      while (degreeStart > 0 && /\d/.test(expression[degreeStart - 1])) degreeStart--;
      const degContent = degreeEnd >= degreeStart ? expression.substring(degreeStart, degreeEnd + 1).trim().replace(/\u00B2/g, '2').replace(/\u00B3/g, '3') : '';
      const deg23 = degContent === '2' || degContent === '3';
      if (degreeEnd >= degreeStart) {
        blocks.push({ rootStart: afterRoot - 1, degreeStart, degreeEnd, radicandStart: afterRoot + 1, radicandEnd: closeIdx - 2, degreeIs2or3: deg23 });
      } else {
        blocks.push({ rootStart: afterRoot - 1, degreeStart: bracketIdx, degreeEnd: bracketIdx - 1, radicandStart: afterRoot + 1, radicandEnd: closeIdx - 2, degreeIs2or3: deg23 });
      }
      idx = closeIdx;
    }
    return blocks;
  };

  const renderExpressionWithCursor = () => {
    if (expression.length === 0) {
      const cursorClasses = "inline-block w-0.5 bg-blue-400 animate-pulse shadow-[0_0_8px_theme(colors.blue.400)]";
      return <span className={`${cursorClasses} h-8 -mb-1 align-baseline`}></span>;
    }
    // Exponent path: show 2⁵ (superscript), never raw ^() — same on web and Android.
    // Проверяем по наличию ( и символу перед ней (^ или не буква/цифра), чтобы сработало при любой кодировке.
    let hasExponent =
      expression.includes('^') ||
      expression.includes('^(') ||
      expression.includes('\uFF3E') ||
      findNextExponent(0) >= 0 ||
      (expression.length > 0 && [...expression].some((c) => c.charCodeAt(0) === 0x5E)) ||
      expression.includes('√[') ||
      expression.includes('√√[') ||
      expression.includes('√√［') ||
      expression.includes('log[') ||
      /[\d.]\s*[√\u221A]/.test(expression);
    if (!hasExponent) {
      const openIdx = expression.indexOf('(');
      if (openIdx >= 1) {
        let back = openIdx - 1;
        while (back >= 0 && expression[back] === ' ') back--;
        const c = back >= 0 ? expression[back] : null;
        const isCaretLike = c === '^' || c === '\uFF3E' || (c != null && c.charCodeAt(0) === 0x5E);
        const isSqrt = c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
        if (isCaretLike || (c != null && !/[\d.a-zA-Z]/.test(c) && !isSqrt)) hasExponent = true;
      }
    }
    if (!hasExponent) return renderExpressionWithCursorLegacy();

    const cursorClasses = "inline-block w-0.5 bg-blue-400 animate-pulse shadow-[0_0_8px_theme(colors.blue.400)]";
    const cursorElement = <span className={`${cursorClasses} h-8 -mb-1 align-baseline`}></span>;
    /** Курсор в индексе (степень, основание log, sub/sup): визуально меньше */
    const indexCursorElement = <span className={`${cursorClasses} h-4 -mb-0.5 align-baseline`}></span>;
    const supCursorElement = indexCursorElement;
    const openParen = (c: string) => c === '(' || c === '\uFF08';
    const closeParen = (c: string) => c === ')' || c === '\uFF09';
    const isCaret = (c: string) => c === '^' || c === '\uFF3E' || (c != null && c.charCodeAt(0) === 0x5E);
    const isCaretOrOpen = (c: string) => isCaret(c) || openParen(c);
    const isClose = (c: string) => closeParen(c);
    const exponentDisplayOnly = (raw: string, cursorOffset: number): { text: string; cursor: number } => {
      let start = 0;
      while (start < raw.length && (isCaretOrOpen(raw[start]) || raw[start] === ' ')) start++;
      let end = raw.length;
      while (end > start && (isClose(raw[end - 1]) || raw[end - 1] === ' ')) end--;
      const text = raw.substring(start, end);
      const cursor = cursorOffset < start ? 0 : (cursorOffset > end ? text.length : cursorOffset - start);
      return { text, cursor: Math.min(Math.max(0, cursor), text.length) };
    };

    const isSqrtChar = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
    const tryRenderLog = (start: number): { node: React.ReactNode; end: number } | null => {
      if (start + 4 > expression.length || expression.substring(start, start + 4) !== 'log[') return null;
      const baseStart = start + 4;
      let bracketEnd = baseStart;
      while (bracketEnd < expression.length && expression[bracketEnd] !== ']' && expression[bracketEnd] !== '\uFF3D') bracketEnd++;
      if (bracketEnd >= expression.length || (expression[bracketEnd] !== ']' && expression[bracketEnd] !== '\uFF3D')) return null;
      const baseContent = expression.substring(baseStart, bracketEnd);
      const openP = bracketEnd + 1;
      if (openP >= expression.length || (expression[openP] !== '(' && expression[openP] !== '\uFF08')) return null;
      let depth = 1;
      let closeP = openP + 1;
      while (closeP < expression.length && depth > 0) {
        if (expression[closeP] === '(' || expression[closeP] === '\uFF08') depth++;
        else if (expression[closeP] === ')' || expression[closeP] === '\uFF09') depth--;
        closeP++;
      }
      if (depth !== 0) return null;
      const argStart = openP + 1;
      const argEnd = closeP - 2;
      const argContent = expression.substring(argStart, argEnd + 1);
      const cur = cursorPosition;
      const renderBasePart = (s: string): React.ReactNode => {
        const idx = s.indexOf('^(');
        if (idx < 0) return s;
        let d = 1, i = idx + 2;
        while (i < s.length && d > 0) {
          if (s[i] === '(') d++;
          else if (s[i] === ')') d--;
          i++;
        }
        const exp = s.substring(idx + 2, i - 1);
        const before = s.substring(0, idx);
        return <>{before}<sup className="align-baseline" style={{ fontSize: '0.75em' }}>{exp}</sup>{i < s.length ? renderBasePart(s.substring(i)) : null}</>;
      };
      const baseNode = <sub className="align-baseline" style={{ fontSize: '0.85em' }}>{renderBasePart(baseContent)}</sub>;
      const argNode = argContent ? <MathRenderer expression={argContent} className="result-exponent-inner" /> : null;
      const cursorInBase = cur >= baseStart && cur <= bracketEnd;
      const cursorInArg = cur >= argStart && cur <= argEnd + 1;
      let logNode: React.ReactNode;
      if (cursorInBase) {
        const rel = cur - baseStart;
        const beforeBase = baseContent.substring(0, Math.min(rel, baseContent.length));
        const afterBase = baseContent.substring(Math.min(rel, baseContent.length));
        logNode = <span className="inline-flex items-baseline"><span>log</span><sub className="align-baseline" style={{ fontSize: '0.85em' }}>{beforeBase}{indexCursorElement}{afterBase}</sub><span>(</span>{argContent ? <MathRenderer expression={argContent} className="result-exponent-inner" /> : null}<span>)</span></span>;
      } else if (cursorInArg) {
        const rel = cur - argStart;
        const beforeArg = argContent.substring(0, Math.min(rel, argContent.length));
        const afterArg = argContent.substring(Math.min(rel, argContent.length));
        logNode = <span className="inline-flex items-baseline"><span>log</span>{baseNode}<span>(</span>{beforeArg}{cursorElement}{afterArg}<span>)</span></span>;
      } else if (cur === start) {
        logNode = <span className="inline-flex items-baseline">{cursorElement}<span>log</span>{baseNode}<span>(</span>{argNode}<span>)</span></span>;
      } else if (cur === openP || cur === bracketEnd + 1) {
        logNode = <span className="inline-flex items-baseline"><span>log</span>{baseNode}{cur === openP ? <>{cursorElement}<span>(</span></> : <span>(</span>}{argNode}<span>)</span></span>;
      } else if (cur === closeP - 1) {
        logNode = <span className="inline-flex items-baseline"><span>log</span>{baseNode}<span>(</span>{argNode}<span>)</span>{cursorElement}</span>;
      } else {
        logNode = <span className="inline-flex items-baseline"><span>log</span>{baseNode}<span>(</span>{argNode}<span>)</span></span>;
      }
      return { node: logNode, end: closeP };
    };
    const tryRenderNthRoot = (start: number): { node: React.ReactNode; end: number } | null => {
      if (start >= expression.length || !isSqrtChar(expression[start])) return null;
      let p = start + 1;
      let deg = '';
      const parseBracketBlock = (from: number): { content: string; end: number } => {
        if (from >= expression.length || (expression[from] !== '[' && expression[from] !== '\uFF3B')) return { content: '', end: from };
        let d = 1, i = from + 1;
        while (i < expression.length && d > 0) {
          if (expression[i] === '[' || expression[i] === '\uFF3B') d++;
          else if (expression[i] === ']' || expression[i] === '\uFF3D') d--;
          i++;
        }
        if (d !== 0) return { content: '', end: from };
        return { content: expression.substring(from + 1, i - 1), end: i };
      };
      if (p < expression.length && (expression[p] === '[' || expression[p] === '\uFF3B')) {
        const br = parseBracketBlock(p);
        deg = br.content;
        p = br.end;
        if (p < expression.length && (expression[p] === ']' || expression[p] === '\uFF3D')) p++;
      } else if (p < expression.length && isSqrtChar(expression[p])) {
        p++;
        if (p < expression.length && (expression[p] === '[' || expression[p] === '\uFF3B')) {
          const br = parseBracketBlock(p);
          deg = br.content;
          p = br.end;
          if (p < expression.length && (expression[p] === ']' || expression[p] === '\uFF3D')) p++;
        }
      }
      while (p < expression.length && (expression[p] === ' ' || isSqrtChar(expression[p]))) p++;
      if (p >= expression.length || !openParen(expression[p])) return null;
      const degreeStart = start + 2;
      const degreeEnd = p - 1;
      const openParenPos = p;
      let depth = 1;
      let q = p + 1;
      while (q < expression.length && depth > 0) {
        if (openParen(expression[q])) depth++;
        else if (closeParen(expression[q])) depth--;
        q++;
      }
      const radicandStart = p + 1;
      const radicandEnd = q - 2;
      const rad = expression.substring(radicandStart, q - 1);
      const unwrapRadicand = (r: string): { display: string; startOff: number } => {
        const t = r.trim();
        const trimStart = r.indexOf(t);
        const isSqrt = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
        if (t.length > 2 && isSqrt(t[0]) && (t[1] === '(' || t[1] === '\uFF08')) {
          let depth = 1, i = 2;
          while (i < t.length && depth > 0) {
            if (t[i] === '(' || t[i] === '\uFF08') depth++;
            else if (t[i] === ')' || t[i] === '\uFF09') { depth--; if (depth === 0) return { display: t.substring(2, i).trim(), startOff: trimStart + 2 }; }
            i++;
          }
        }
        if (t.length > 2 && (t[0] === '(' || t[0] === '\uFF08') && (t[t.length - 1] === ')' || t[t.length - 1] === '\uFF09')) {
          let depth = 1, i = 1;
          while (i < t.length && depth > 0) {
            if (t[i] === '(' || t[i] === '\uFF08') depth++;
            else if (t[i] === ')' || t[i] === '\uFF09') { depth--; if (depth === 0 && i === t.length - 1) return { display: t.substring(1, i).trim(), startOff: trimStart + 1 }; }
            i++;
          }
        }
        return { display: r, startOff: 0 };
      };
      const { display: radDisplay, startOff: radStartOff } = unwrapRadicand(rad);
      const degSanitized = deg.replace(/√|\u221A/g, '').replace(/^[\s\[\uFF3B]+/, '').replace(/[\s\]\uFF3D]+$/, '').trim();
      const rootDegreeForDisplay = (d: string) => {
        if (!d || d === '-') return '';
        const inParens = d.match(/\^?\s*\(\s*(\d+)\s*\)/);
        if (inParens) return inParens[1];
        const noSup = d.replace(/\u00B2/g, '2').replace(/\u00B3/g, '3').replace(/\u00B9/g, '1');
        const num = noSup.match(/\d+/);
        return num ? num[0] : (d.trim() || '');
      };
      let degDisplay = (deg === '' || degSanitized === '' || degSanitized === '-') ? '' : rootDegreeForDisplay(degSanitized || deg.trim());
      const degreeIs2or3 = degDisplay === '2' || degDisplay === '3';
      if (degDisplay === '2') degDisplay = '';
      const cur = cursorPosition;
      const curInForbiddenZone = degreeIs2or3 && cur > start && cur < radicandStart;
      const radicandWithCursorAtStart = <span className="radicand border-t-2 border-current align-baseline font-normal" style={{ fontSize: '1em', paddingLeft: 12, minWidth: 20 }}>{cursorElement}{radDisplay}</span>;
      const degWithCur = degDisplay
        ? (cur >= degreeStart && cur <= degreeEnd && !degreeIs2or3
            ? <sup className="align-baseline root-degree-n">{degDisplay.substring(0, cur - degreeStart)}{supCursorElement}{degDisplay.substring(cur - degreeStart)}</sup>
            : <sup className="align-baseline root-degree-n">{degDisplay}</sup>)
        : (cur >= degreeStart && cur <= degreeEnd && !degreeIs2or3 ? supCursorElement : null);
      const relRadCur = cur - radicandStart;
      const dispCur = Math.max(0, Math.min(radDisplay.length, relRadCur - radStartOff));
      const radWithCur = cur >= radicandStart && cur <= radicandEnd + 1
        ? cur <= radicandEnd
          ? <span className="radicand border-t-2 border-current align-baseline font-normal" style={{ fontSize: '1em', paddingLeft: 12, minWidth: 20 }}>{radDisplay.substring(0, dispCur)}{cursorElement}{radDisplay.substring(dispCur)}</span>
          : <span className="radicand border-t-2 border-current align-baseline font-normal" style={{ fontSize: '1em', paddingLeft: 12, minWidth: 20 }}>{radDisplay}{cursorElement}</span>
        : <span className="radicand border-t-2 border-current align-baseline font-normal" style={{ fontSize: '1em', paddingLeft: 12, minWidth: 20 }}>{radDisplay}</span>;
      const beforeRad = cur === openParenPos ? <span className="inline-flex items-center align-middle">√{cursorElement}</span> : <span className="inline-flex items-center align-middle">√</span>;
      const afterDeg = (cur === degreeEnd + 1 || curInForbiddenZone) && degreeIs2or3
        ? <>{degWithCur}<span className="inline-flex items-center align-middle">√</span>{radicandWithCursorAtStart}</>
        : cur === degreeEnd + 1 ? <>{degWithCur}{cursorElement}<span className="inline-flex items-center align-middle">√</span>{radWithCur}</> : <>{degWithCur}{beforeRad}{radWithCur}</>;
      const rootNode = cur > start && cur < degreeStart && !curInForbiddenZone
        ? <span key={start} className="inline-flex items-baseline">{cursorElement}{degDisplay ? <sup className="align-baseline root-degree-n">{degDisplay}</sup> : null}<span className="inline-flex items-center align-middle">√</span><span className="radicand border-t-2 border-current align-baseline font-normal" style={{ fontSize: '1em', paddingLeft: 12, minWidth: 20 }}>{radDisplay}</span></span>
        : curInForbiddenZone
        ? <span key={start} className="inline-flex items-baseline">{degDisplay ? <sup className="align-baseline root-degree-n">{degDisplay}</sup> : null}<span className="inline-flex items-center align-middle">√</span>{radicandWithCursorAtStart}</span>
        : <span key={start} className="inline-flex items-baseline">{afterDeg}</span>;
      return { node: rootNode, end: q };
    };

    // Единственный проход: ищем ^ затем (, парная ); выводим только основание и <sup>содержимое</sup>, никогда ^()
    const out: React.ReactNode[] = [];
    let cursorAlreadyRendered = false;
    let pos = 0;
    while (pos < expression.length) {
      const logResult = tryRenderLog(pos);
      if (logResult) {
        out.push(<React.Fragment key={`log-${pos}`}>{logResult.node}</React.Fragment>);
        if (cursorPosition >= pos && cursorPosition < logResult.end) cursorAlreadyRendered = true;
        if (cursorPosition === logResult.end) {
          out.push(<span key={`cursor-after-log-${pos}`} style={{ display: 'inline-flex', alignItems: 'baseline' }}>{cursorElement}</span>);
          cursorAlreadyRendered = true;
        }
        pos = logResult.end;
        continue;
      }
      const rootResult = tryRenderNthRoot(pos);
      if (rootResult) {
        let prevVisibleIdx = pos - 1;
        while (prevVisibleIdx >= 0 && expression[prevVisibleIdx] === ' ') prevVisibleIdx--;
        const prevCh = prevVisibleIdx >= 0 ? expression[prevVisibleIdx] : '';
        const digitBeforeRoot = prevVisibleIdx >= 0 && /[\d.]/.test(prevCh);
        const needGap = pos > 0 && (prevCh === '+' || prevCh === '-' || digitBeforeRoot);
        const gapAtStart = pos === 0;
        if (cursorPosition === pos && !cursorAlreadyRendered) {
          out.push(cursorElement);
          cursorAlreadyRendered = true;
        }
        if (needGap || gapAtStart) {
          out.push(<span key={`root-gap-${pos}`} style={{ display: 'inline-block', width: 12, minWidth: 8, overflow: 'hidden', verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>);
        }
        const rootWithAfterGap = rootResult.end < expression.length
          ? <span key={`root-wrap-${pos}`} style={{ display: 'inline-flex', marginRight: 12, verticalAlign: 'baseline' }}>{rootResult.node}</span>
          : rootResult.node;
        out.push(rootWithAfterGap);
        if (cursorPosition >= pos && cursorPosition < rootResult.end) cursorAlreadyRendered = true;
        if (cursorPosition === rootResult.end) {
          out.push(<span key={`cursor-after-root-${pos}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0 }}><span style={{ display: 'inline-block', width: 12, minWidth: 8, verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>{cursorElement}</span>);
          cursorAlreadyRendered = true;
        }
        pos = rootResult.end;
        continue;
      }
      if ((expression[pos] === '[' || expression[pos] === '\uFF3B') && pos + 1 < expression.length) {
        const afterBracket = tryRenderNthRoot(pos + 1);
        if (afterBracket) {
          let prevVisibleIdxB = pos - 1;
          while (prevVisibleIdxB >= 0 && expression[prevVisibleIdxB] === ' ') prevVisibleIdxB--;
          const prevChB = prevVisibleIdxB >= 0 ? expression[prevVisibleIdxB] : '';
          const digitBeforeRootB = prevVisibleIdxB >= 0 && /[\d.]/.test(prevChB);
          const needGapB = pos > 0 && (prevChB === '+' || prevChB === '-' || digitBeforeRootB);
          const gapAtStartB = pos === 0;
          if (cursorPosition === pos && !cursorAlreadyRendered) {
            out.push(cursorElement);
            cursorAlreadyRendered = true;
          }
          if (needGapB || gapAtStartB) {
            out.push(<span key={`root-gap-b-${pos}`} style={{ display: 'inline-block', width: 12, minWidth: 8, overflow: 'hidden', verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>);
          }
          const bracketRootWithAfterGap = afterBracket.end < expression.length
            ? <span key={`root-wrap-b-${pos}`} style={{ display: 'inline-flex', marginRight: 12, verticalAlign: 'baseline' }}>{afterBracket.node}</span>
            : afterBracket.node;
          out.push(bracketRootWithAfterGap);
          if (cursorPosition >= pos + 1 && cursorPosition < afterBracket.end) cursorAlreadyRendered = true;
          if (cursorPosition === afterBracket.end) {
            out.push(<span key={`cursor-after-root-b-${pos}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0 }}><span style={{ display: 'inline-block', width: 12, minWidth: 8, verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>{cursorElement}</span>);
            cursorAlreadyRendered = true;
          }
          pos = afterBracket.end;
          continue;
        }
      }
      const ch = expression[pos];
      const looksLikeCaret = isCaret(ch);
      let afterCaret = pos + 1;
      while (afterCaret < expression.length && expression[afterCaret] === ' ') afterCaret++;
      const hasOpenAfter = afterCaret < expression.length && openParen(expression[afterCaret]);
      // Запас: если после символа идёт (, считаем степенью (на Android символ ^ может быть другим)
      const treatAsExponent = hasOpenAfter && (looksLikeCaret || (pos > 0 && !/[\d.a-zA-Z]/.test(ch)));
      if (treatAsExponent) {
        const openParenIndex = afterCaret;
        let depth = 1;
        let closePos = openParenIndex + 1;
        while (closePos < expression.length && depth > 0) {
          if (openParen(expression[closePos])) depth++;
          else if (closeParen(expression[closePos])) depth--;
          closePos++;
        }
        const closeParenIndex = closePos - 1;
        const contentStart = openParenIndex + 1;
        const rawContent = expression.substring(contentStart, closeParenIndex);
        const cursorInRaw = (cursorPosition >= contentStart && cursorPosition <= closeParenIndex) ? cursorPosition - contentStart : -1;
        const { text: content, cursor: cursorInContent } = exponentDisplayOnly(rawContent, cursorInRaw >= 0 ? cursorInRaw : 0);
        if (cursorPosition >= pos && cursorPosition < contentStart && !cursorAlreadyRendered) { out.push(cursorElement); cursorAlreadyRendered = true; }
        if (cursorInRaw >= 0 && cursorInRaw <= rawContent.length) {
          out.push(<sup className="result-exponent align-baseline"><ExpressionWithCursorDisplay expression={rawContent} cursorPosition={cursorInRaw} showCursor /></sup>);
          cursorAlreadyRendered = true;
        } else {
          out.push(<sup className="result-exponent align-baseline">{content ? <MathRenderer expression={content} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>}</sup>);
        }
        if (cursorPosition > closeParenIndex && cursorPosition < closePos && !cursorAlreadyRendered) { out.push(cursorElement); cursorAlreadyRendered = true; }
        pos = closePos;
        continue;
      }
      const nextIsRoot = pos + 1 < expression.length && (expression[pos + 1] === '√' || expression[pos + 1]?.charCodeAt(0) === 0x221A);
      const digitBeforeRoot = /[\d.]/.test(ch) && nextIsRoot;
      const isRootChar = ch === '√' || (ch != null && ch.charCodeAt(0) === 0x221A);
      let prevGapIdx = pos - 1;
      while (prevGapIdx >= 0 && expression[prevGapIdx] === ' ') prevGapIdx--;
      const prevChForGap = prevGapIdx >= 0 ? expression[prevGapIdx] : '';
      const needGapBeforeRoot = isRootChar && (pos === 0 || (pos > 0 && (/[\d.]/.test(prevChForGap) || prevChForGap === '+' || prevChForGap === '-')));
      if (digitBeforeRoot) {
        const prevIsDigit = pos > 0 && /[\d.]/.test(expression[pos - 1]);
        if (cursorPosition === pos && !cursorAlreadyRendered) { out.push(cursorElement); cursorAlreadyRendered = true; }
        if (pos > 0 && cursorPosition !== pos && !prevIsDigit) {
          out.push(<span key={`gap-${pos}`} style={{ display: 'inline-block', width: 12, overflow: 'hidden', verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>);
        }
        out.push(<span key={pos}>{ch}</span>);
      } else {
        if (cursorPosition === pos && !cursorAlreadyRendered) {
          out.push(cursorElement);
          cursorAlreadyRendered = true;
        }
        if (needGapBeforeRoot) {
          out.push(<span key={`gap-root-${pos}`} style={{ display: 'inline-block', width: 12, minWidth: 8, overflow: 'hidden', verticalAlign: 'baseline' }} aria-hidden>{'\u00A0'}</span>);
        }
        out.push(<span key={pos}>{ch}</span>);
      }
      pos++;
    }
    if (cursorPosition === expression.length && !cursorAlreadyRendered) out.push(cursorElement);
    return <>{out}</>;

    // Early path: if cursor is inside an exponent, render only base + content (no ^()) and return.
    // Detect exponent by scanning for ^ and ( so it works even if isExponentStart fails (e.g. encoding).
    for (let ei = 0; ei < expression.length; ei++) {
      const ch = expression[ei];
      const isCaret = ch === '^' || ch === '\uFF3E' || (ch && ch.charCodeAt(0) === 0x5E);
      if (!isCaret) continue;
      let p = ei + 1;
      while (p < expression.length && expression[p] === ' ') p++;
      if (p >= expression.length || !openParen(expression[p])) continue;
      const contentStart = p + 1;
      let depth = 1;
      let ej = contentStart;
      while (ej < expression.length && depth > 0) {
        if (openParen(expression[ej])) depth++;
        else if (closeParen(expression[ej])) depth--;
        ej++;
      }
      const closingParenAt = ej - 1; // позиция закрывающей )
      const insideExp = cursorPosition >= contentStart && cursorPosition <= closingParenAt;
      if (insideExp) {
        const content = expression.substring(contentStart, closingParenAt); // только содержимое, без )
        const cursorInContent = Math.min(cursorPosition - contentStart, content.length);
        const base = expression.substring(0, ei);
        return (
          <>
            {base.length > 0 && <span>{base}</span>}
            <sup className="result-exponent align-baseline"><ExpressionWithCursorDisplay expression={content} cursorPosition={cursorInContent} showCursor /></sup>
          </>
        );
      }
    }

    const resultElements: React.ReactNode[] = [];
    let i = 0;
    let processedUpTo = 0; // Track how much of the expression we've processed
    while (i < expression.length) {
      if (cursorPosition === i && !isExponentStart(i)) resultElements.push(cursorElement);
      if (isExponentStart(i)) {
        const contentStart = exponentContentStart(i);
        let depth = 1;
        let j = contentStart;
        while (j < expression.length && depth > 0) {
          if (openParen(expression[j])) depth++;
          else if (closeParen(expression[j])) depth--;
          j++;
        }
        const content = expression.substring(contentStart, depth === 0 ? j - 1 : j);
        const expStart = contentStart;
        const expEnd = depth === 0 ? j - 1 : j;
        const cursorInExp = (cursorPosition >= expStart && cursorPosition <= expEnd) ? cursorPosition - expStart : -1;
        
        // If cursor is inside exponent, show base + only the content (number) without ^()
        if (cursorInExp >= 0 && cursorInExp <= content.length) {
          // Get the base (everything before ^)
          const base = expression.substring(0, i);
          // Only add base if it hasn't been processed yet (if processedUpTo < i, base wasn't processed)
          if (base.length > 0 && processedUpTo < i) {
            resultElements.push(<span key={`base-${i}`}>{base}</span>);
            processedUpTo = i;
          }
          // Show only the exponent content (frac/root/log render correctly) with cursor, without ^()
          resultElements.push(<sup key={`exp-content-${i}`} className="result-exponent align-baseline"><ExpressionWithCursorDisplay expression={content} cursorPosition={cursorInExp} showCursor /></sup>);
          i = depth === 0 ? j : expression.length;
          processedUpTo = i;
          continue;
        }
        
        // Cursor is outside exponent - show base + superscript
        if (cursorPosition >= i && cursorPosition < contentStart) resultElements.push(cursorElement);
        const expNode = <sup className="result-exponent align-baseline">{content ? <MathRenderer expression={content} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>}</sup>;
        resultElements.push(expNode);
        if (cursorPosition > expEnd && cursorPosition < (depth === 0 ? j : expression.length)) resultElements.push(cursorElement);
        i = depth === 0 ? j : expression.length;
        processedUpTo = i;
        continue;
      }
      const nextExp = findNextExponent(i);
      const end = nextExp >= 0 ? nextExp : expression.length;
      const text = expression.substring(i, end);
      const segmentStart = i;
      // Fallback: detect ^(...) — ищем по открывающей скобке, затем проверяем что перед ней ^ (или 0x5E)
      let caretIdx = -1;
      for (let k = 0; k < text.length; k++) {
        const isCaret = text[k] === '^' || text[k] === '\uFF3E' || (text[k] != null && text[k].charCodeAt(0) === 0x5E);
        if (isCaret && k + 1 < text.length) {
          let p = k + 1;
          while (p < text.length && text[p] === ' ') p++;
          if (p < text.length && (text[p] === '(' || text[p] === '\uFF08')) {
            caretIdx = k;
            break;
          }
        }
      }
      if (caretIdx < 0) {
        const openIdx = text.indexOf('(');
        if (openIdx >= 1) {
          let back = openIdx - 1;
          while (back >= 0 && text[back] === ' ') back--;
          if (back >= 0) {
            const c = text[back];
            if (c === '^' || c === '\uFF3E' || (c != null && c.charCodeAt(0) === 0x5E)) caretIdx = back;
          }
        }
      }
      if (caretIdx >= 0) {
        let q = caretIdx + 1;
        while (q < text.length && text[q] === ' ') q++;
        const contentStart = (q < text.length && (text[q] === '(' || text[q] === '\uFF08')) ? q + 1 : caretIdx + 2;
        let depth = 1;
        let j = contentStart;
        while (j < text.length && depth > 0) {
          if (text[j] === '(' || text[j] === '\uFF08') depth++;
          else if (text[j] === ')' || text[j] === '\uFF09') depth--;
          j++;
        }
        const closeIdx = j - 1;
        const expContent = text.substring(contentStart, closeIdx);
        const base = text.substring(0, caretIdx);
        const absContentStart = segmentStart + contentStart;
        const absExpEnd = segmentStart + closeIdx;
        const cursorInExp = (cursorPosition >= absContentStart && cursorPosition <= absExpEnd) ? cursorPosition - absContentStart : -1;
        
        // If cursor is inside exponent, show base + only the content (number) without ^()
        if (cursorInExp >= 0 && cursorInExp <= expContent.length) {
          // Only add base if it hasn't been processed yet
          const absBaseEnd = segmentStart + caretIdx;
          if (base.length > 0 && processedUpTo < absBaseEnd) {
            resultElements.push(<span key={`base-fallback-${segmentStart}`}>{base}</span>);
            processedUpTo = absBaseEnd;
          }
          // Then show only the exponent content (frac/root/log render correctly) with cursor
          resultElements.push(<sup key={`exp-content-fallback-${segmentStart}`} className="result-exponent align-baseline"><ExpressionWithCursorDisplay expression={expContent} cursorPosition={cursorInExp} showCursor /></sup>);
          i = segmentStart + closeIdx + 1;
          processedUpTo = i;
          continue;
        } else {
          // Cursor is outside exponent - show base + superscript
          if (cursorPosition >= segmentStart && cursorPosition < segmentStart + caretIdx) {
            const pos = cursorPosition - segmentStart;
            resultElements.push(<span key={segmentStart}>{base.substring(0, pos)}{cursorElement}{base.substring(pos)}</span>);
          } else if (cursorPosition >= segmentStart + caretIdx && cursorPosition < absContentStart) {
            resultElements.push(<span key={segmentStart}>{base}</span>);
            resultElements.push(cursorElement);
          } else {
            resultElements.push(<span key={segmentStart}>{base}</span>);
          }
          const expNode = <sup className="result-exponent align-baseline">{expContent ? <MathRenderer expression={expContent} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>}</sup>;
          resultElements.push(expNode);
          if (cursorPosition > absExpEnd && cursorPosition < segmentStart + closeIdx + 1) resultElements.push(cursorElement);
          i = segmentStart + closeIdx + 1;
          processedUpTo = i;
        }
      } else {
        // Не выводить сырой текст, если в нём есть ^(...) — разобрать и отобразить как степень
        let safeCaretIdx = -1;
        for (let k = 0; k < text.length; k++) {
          const isCaret = text[k] === '^' || text[k] === '\uFF3E' || (text[k] != null && text[k].charCodeAt(0) === 0x5E);
          if (isCaret && k + 1 < text.length) {
            let p = k + 1;
            while (p < text.length && text[p] === ' ') p++;
            if (p < text.length && (text[p] === '(' || text[p] === '\uFF08')) {
              safeCaretIdx = k;
              break;
            }
          }
        }
        if (safeCaretIdx < 0) {
          const openIdx = text.indexOf('(');
          if (openIdx >= 1) {
            let back = openIdx - 1;
            while (back >= 0 && text[back] === ' ') back--;
            if (back >= 0) {
              const c = text[back];
              if (c === '^' || c === '\uFF3E' || (c != null && c.charCodeAt(0) === 0x5E)) safeCaretIdx = back;
            }
          }
        }
        if (safeCaretIdx >= 0) {
          let q = safeCaretIdx + 1;
          while (q < text.length && text[q] === ' ') q++;
          const segContentStart = (q < text.length && (text[q] === '(' || text[q] === '\uFF08')) ? q + 1 : safeCaretIdx + 2;
          let depth = 1;
          let j = segContentStart;
          while (j < text.length && depth > 0) {
            if (text[j] === '(' || text[j] === '\uFF08') depth++;
            else if (text[j] === ')' || text[j] === '\uFF09') depth--;
            j++;
          }
          const segCloseIdx = j - 1;
          const segExpContent = text.substring(segContentStart, segCloseIdx);
          const segBase = text.substring(0, safeCaretIdx);
          const absContentStart = segmentStart + segContentStart;
          const absExpEnd = segmentStart + segCloseIdx;
          const cursorInSegExp = (cursorPosition >= absContentStart && cursorPosition <= absExpEnd) ? cursorPosition - absContentStart : -1;
          const cursorInBase = cursorPosition >= segmentStart && cursorPosition < segmentStart + safeCaretIdx;
          if (segBase.length > 0 && processedUpTo < segmentStart + safeCaretIdx) {
            if (cursorInBase) {
              const pos = cursorPosition - segmentStart;
              resultElements.push(<span key={`seg-base-${segmentStart}`}>{segBase.substring(0, pos)}{cursorElement}{segBase.substring(pos)}</span>);
            } else {
              resultElements.push(<span key={`seg-base-${segmentStart}`}>{segBase}</span>);
            }
          } else if (cursorInBase) {
            const pos = cursorPosition - segmentStart;
            resultElements.push(<span key={`seg-base-${segmentStart}`}>{segBase.substring(0, pos)}{cursorElement}{segBase.substring(pos)}</span>);
          }
          const expNode = <sup className="result-exponent align-baseline">{segExpContent ? <MathRenderer expression={segExpContent} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>}</sup>;
          if (cursorInSegExp >= 0 && cursorInSegExp <= segExpContent.length) {
            resultElements.push(<sup key={`seg-exp-${segmentStart}`} className="result-exponent align-baseline"><ExpressionWithCursorDisplay expression={segExpContent} cursorPosition={cursorInSegExp} showCursor /></sup>);
          } else {
            resultElements.push(expNode);
            if (cursorPosition > absExpEnd && cursorPosition < segmentStart + segCloseIdx + 1) resultElements.push(cursorElement);
          }
          i = segmentStart + segCloseIdx + 1;
          processedUpTo = i;
        } else {
          if (cursorPosition > i && cursorPosition <= end) {
            const pos = cursorPosition - i;
            resultElements.push(<span key={i}>{text.substring(0, pos)}{cursorElement}{text.substring(pos)}</span>);
          } else {
            resultElements.push(<span key={i}>{text}</span>);
          }
          i = end;
          processedUpTo = i;
        }
      }
    }
    if (cursorPosition === expression.length) resultElements.push(cursorElement);
    return <>{resultElements}</>;
  };

  const renderExpressionWithCursorLegacy = () => {
    return <ExpressionWithCursorDisplay expression={expression} cursorPosition={cursorPosition} />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative overflow-hidden">
       <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delay-1 { animation: float 9s ease-in-out infinite 1s; }
        .animate-float-delay-2 { animation: float 10s ease-in-out infinite 0.5s; }
        .animate-float-delay-3 { animation: float 7s ease-in-out infinite 1.5s; }
        sup.result-exponent,
        .result-exponent {
          display: inline-block !important;
          vertical-align: super !important;
          font-size: 0.75em !important;
          line-height: 1 !important;
          font-weight: inherit !important;
          position: relative !important;
          top: -0.35em !important;
        }
        .result-exponent .result-exponent-inner,
        .result-exponent .katex { font-size: 1em !important; }
        /* Степень корня: как на веб — индекс сверху слева от √, чуть меньше основного текста, не как экспонента */
        .root-degree-n {
          font-style: normal !important;
          font-family: sans-serif !important;
          font-size: 0.85em !important;
          vertical-align: top !important;
          position: relative !important;
          top: -0.28em !important;
          line-height: 1 !important;
          display: inline-block !important;
        }
        .root-degree-n + span span { font-size: inherit !important; vertical-align: baseline !important; }
        .radicand { font-variant: normal !important; border-top-width: 2px !important; padding-left: 12px !important; min-width: 20px !important; }
        .root-coeff-margin { margin-left: 12px !important; display: inline-block !important; }
      `}</style>
      {floatingElements.map((el, i) => <div key={i} className={`absolute font-mono text-[#3A8DFF] pointer-events-none ${el.class}`}>{el.content}</div>)}
      <SolutionLoadingScreen isVisible={isCalculating} />

      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <button onClick={onBack} aria-label={t('solution.backToCalculator')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/10 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center justify-center space-x-2 min-w-0"> {/* Added flex container for icon and title */}
            <TutorAvatarIcon className="w-8 h-8 opacity-80 flex-shrink-0" /> {/* Mascot here */}
            <h1 className="text-xl font-bold text-center truncate min-w-0">{t('calculator.title')}</h1>
          </div>
          <div className="w-10 flex-shrink-0"></div>
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      {/* Main field: segment rendering with moving cursor + KaTeX for exponents */}
      <div className="px-4 pt-4 relative z-[1]">
        <div
          className="h-40 text-3xl text-right overflow-x-auto overflow-y-auto rounded-lg p-4 bg-[#1a1a24]/30 shadow-[0_0_15px_rgba(58,141,255,0.3)] flex flex-col justify-end scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="min-h-[1.5rem] break-all inline-flex flex-wrap items-center justify-end text-right w-full pr-2"
            style={{ lineHeight: 1.5, paddingRight: 12 }}
            data-exponent-render={expression.includes('^') || expression.includes('^(') ? '1' : undefined}
          >
            {renderExpressionWithCursor()}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 relative z-[1]">
        {result.image ? (
          <div className="mt-3 rounded-xl overflow-hidden bg-[#1a1a24]/50 border border-white/10 shadow-lg">
            <img
              src={result.image}
              alt={result.problem || t('calculator.title')}
              className="w-full max-h-48 object-contain object-center"
            />
          </div>
        ) : null}
      </div>

      <div className="bg-gray-800 p-2 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-[2]" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex justify-start mb-2">
            <button 
                onClick={handleExample}
                aria-label={t('calculator.example')}
                className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 active:scale-95 transition-all"
            >
                {t('calculator.example')}
            </button>
        </div>
        {showAdvanced ? (
          <AdvancedCalculatorKeyboard onKeyPress={handleKeyPress} toggleKeyboard={() => setShowAdvanced(false)} onCalculate={handleCalculate} isCalculating={isCalculating} />
        ) : (
          <CalculatorKeyboard onKeyPress={handleKeyPress} toggleKeyboard={() => setShowAdvanced(true)} onCalculate={handleCalculate} isCalculating={isCalculating} />
        )}
      </div>
    </div>
  );
};

export default ResultScreen;
