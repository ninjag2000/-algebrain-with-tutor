import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { PracticeQuestion } from '../../types';
import MathRenderer from '../../components/MathRenderer';
import CalculatorKeyboard from '../../components/CalculatorKeyboard';
import AdvancedCalculatorKeyboard from '../../components/AdvancedCalculatorKeyboard';
import ExpressionWithCursorDisplay from '../../components/ExpressionWithCursorDisplay';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import { getLogicalCursorLeft, getLogicalCursorRight, getBackspaceDeletionRange, FRAC_INSERT_CURSOR_OFFSET } from '../../utils/cursorNavigation';
import { getTierMultiplier, getHintMultiplierFromSteps, BASE_XP_PRACTICE, BASE_BP_PRACTICE } from '../../utils/rewardMultipliers';
import { getSkillFromQuestion } from '../assessment/getSkillFromQuestion';
import { getFormulasForQuestion } from '../../utils/formulaHints';
import { solveMathProblemFromText } from '../../services/geminiService';
import type { SkillKey } from '../assessment/types';

const SKILL_ICON: Record<SkillKey, string> = {
  arithmetic: '🧮',
  equations: '⚖️',
  logarithms: '📈',
  trigonometry: '📐',
};

/** Названия тиров по сложности (fallback, если локаль ещё не подгружена). */
const TIER_NAMES: Record<number, string> = {
  1: 'Разминка',
  2: 'Новичок',
  3: 'Ученик',
  4: 'Практик',
  5: 'Опытный',
  6: 'Эксперт',
  7: 'Мастер',
};

/** Максимум символов в одной строке формулы. */
const MAX_CHARS_PER_LINE = 35;

/** Разбивает уравнение на строки, не длиннее MAX_CHARS_PER_LINE. Разрыв по пробелам/операторам. Систему system{...} не разбивает — отображается целиком. */
function splitEquationForDisplay(question: string): string[] {
  const q = question.trim();
  if (q.length <= MAX_CHARS_PER_LINE) return [q];
  // Систему уравнений не разбиваем — иначе KaTeX не соберёт \begin{cases}
  if (/system\{/.test(q)) return [q];
  const lines: string[] = [];
  let rest = q;
  while (rest.length > 0) {
    if (rest.length <= MAX_CHARS_PER_LINE) {
      lines.push(rest.trim());
      break;
    }
    let chunk = rest.slice(0, MAX_CHARS_PER_LINE + 1);
    const lastSpace = chunk.lastIndexOf(' ');
    const breakAt = lastSpace >= MAX_CHARS_PER_LINE / 2 ? lastSpace : MAX_CHARS_PER_LINE;
    const line = rest.slice(0, breakAt).trim();
    rest = rest.slice(breakAt).trim();
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [q];
}

/** Находит в строке сегменты встроенных формул в нотации приложения (^(...), frac{}{}) и разбивает на текст/математику. */
function splitInlineFormulas(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  const segments: Array<{ type: 'text' | 'math'; content: string }> = [];
  let pos = 0;
  while (pos < text.length) {
    const nextStar = text.indexOf('**', pos);
    const nextExp = text.indexOf('^(', pos);
    const nextFrac = text.indexOf('frac{', pos);
    let next = text.length;
    let kind: 'math' | null = null;
    if (nextStar !== -1 && nextStar < next) {
      next = nextStar;
      kind = 'math';
    }
    if (nextExp !== -1 && nextExp < next) {
      next = nextExp;
      kind = 'math';
    }
    if (nextFrac !== -1 && nextFrac < next) {
      next = nextFrac;
      kind = 'math';
    }
    if (kind === 'math') {
      if (next > pos) segments.push({ type: 'text', content: text.slice(pos, next) });
      if (text.substring(next, next + 2) === '**') {
        const end = text.indexOf('**', next + 2);
        if (end !== -1) {
          segments.push({ type: 'math', content: text.slice(next + 2, end) });
          pos = end + 2;
          continue;
        }
      }
      if (text.substring(next, next + 2) === '^(') {
        let depth = 1;
        let j = next + 2;
        while (j < text.length && depth > 0) {
          if (text[j] === '(') depth++;
          else if (text[j] === ')') { depth--; if (depth === 0) break; }
          j++;
        }
        let start = next;
        let i = next - 1;
        while (i >= 0 && (text[i] === ' ' || text[i] === '\u00A0')) i--;
        if (i >= 0 && (/\w/.test(text[i]!) || text[i] === ')')) {
          if (text[i] === ')') {
            depth = 1;
            let k = i - 1;
            while (k >= 0 && depth > 0) {
              if (text[k] === ')') depth++;
              else if (text[k] === '(') { depth--; if (depth === 0) break; }
              k--;
            }
            if (depth === 0) start = k;
          } else {
            while (i >= 0 && /\w/.test(text[i]!)) i--;
            start = i + 1;
          }
        }
        const formula = text.slice(start, j + 1);
        if (formula.trim()) segments.push({ type: 'math', content: formula });
        pos = j + 1;
        continue;
      }
      if (text.substring(next, next + 5) === 'frac{') {
        let depth = 0;
        let j = next + 4;
        while (j < text.length) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') { depth--; if (depth === 0) break; }
          j++;
        }
        if (j < text.length && text.substring(j + 1, j + 3) === '{') {
          depth = 1;
          j += 2;
          while (j < text.length && depth > 0) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') { depth--; if (depth === 0) break; }
            j++;
          }
          const formula = text.slice(next, j + 1);
          if (formula.trim()) segments.push({ type: 'math', content: formula });
          pos = j + 1;
          continue;
        }
      }
      pos = next + 1;
      continue;
    }
    segments.push({ type: 'text', content: text.slice(pos) });
    break;
  }
  return segments;
}

/** Рендер контента решения — в том же стиле, что и на Practice Review (ШАГ 1/2 светлый синий, текст серый). */
function renderSolutionContent(content: string): React.ReactNode[] {
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
            <MathRenderer expression={expression} displayMode className="text-gray-200" />
          </div>
        );
      }
    }
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return (
      <p key={lineIndex} className="leading-relaxed text-gray-400 text-sm mb-2">
        {parts.flatMap((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const mathContent = part.substring(2, part.length - 2);
            return [<MathRenderer key={`${lineIndex}-${partIndex}`} expression={mathContent} className="mx-1 align-middle text-gray-200 font-medium" />];
          }
          const segments = splitInlineFormulas(part);
          return segments.map((seg, i) =>
            seg.type === 'math'
              ? <MathRenderer key={`${lineIndex}-${partIndex}-${i}`} expression={seg.content} className="mx-1 align-middle text-gray-200 font-medium" />
              : <span key={`${lineIndex}-${partIndex}-${i}`}>{seg.content}</span>
          );
        })}
      </p>
    );
  });
}

/** Разбивает ответ ИИ на вводное описание и шаги (### Step N / ### Шаг N). Вводное описание не считается первым шагом. */
function splitAiSolutionIntoSteps(fullText: string): { intro: string; steps: string[] } {
  const trimmed = fullText.trim();
  if (!trimmed) return { intro: '', steps: [] };
  const parts = trimmed.split(/\n(?=### )/).map(p => p.trim()).filter(Boolean);
  const isStepHeader = (s: string) => /^###\s*(Step|Шаг)\s*\d+/i.test(s);
  const firstIsStep = parts.length > 0 && isStepHeader(parts[0]!);
  const intro = !firstIsStep && parts.length > 0 ? parts[0]! : '';
  const steps = firstIsStep ? parts : parts.slice(1);
  return { intro, steps };
}

/** Превращает массив шагов в один markdown-текст для renderSolutionContent. */
function stepsToMarkdown(steps: string[]): string {
  return steps.map((step) => {
    const stepMatch = step.match(/^Шаг\s*(\d+):\s*(.*)$/);
    if (stepMatch) return `### Шаг ${stepMatch[1]}\n\n${stepMatch[2]!.trim()}`;
    const ansMatch = step.match(/^Ответ:\s*(.*)$/);
    if (ansMatch) return `### Ответ\n\n**${ansMatch[1]!.trim()}**`;
    return `### Шаг\n\n${step}`;
  }).join('\n\n');
}

/** Уравнение вида x² = k (k > 0) имеет два корня. По тексту задания возвращаем ожидаемый ответ "root,-root" или null. */
function getTwoRootsFromQuestion(question: string | undefined): string | null {
  if (!question || typeof question !== 'string') return null;
  const normalized = question.replace(/\s/g, '');
  const match = normalized.match(/x\^?\(?2\)?\s*=\s*(\d+)/i) ?? normalized.match(/x²\s*=\s*(\d+)/i);
  if (!match) return null;
  const k = parseInt(match[1]!, 10);
  if (k <= 0) return null;
  const root = Math.sqrt(k);
  if (!Number.isInteger(root)) return null;
  return `${root},${-root}`;
}

/** Ответ в виде объединения двух интервалов, например "(-∞,-2) U (-2,+∞)" или "(-∞,-7/2]∪[7/2,∞)". */
function isTwoIntervalsAnswer(answer: string): boolean {
  const s = (answer || '').trim();
  if (!s) return false;
  const parts = s.split(/\s*[U∪]\s*/).map((p) => p.trim()).filter(Boolean);
  return parts.length === 2;
}

interface PracticeScreenProps {
  session: {
    mode: string;
    questions: PracticeQuestion[];
    currentQuestionIndex: number;
    stats: { correct: number; total: number; xpEarned: number };
    consecutiveCorrect?: number;
  };
  onAnswer: (isCorrect: boolean, question?: string, meta?: { hintUsed: boolean; difficulty: number; stepsRevealedCount?: number }, userAnswerRaw?: string) => void;
  onBack?: () => void;
  xp: number;
  streak: number;
  dailyGoal?: number;
  problemsDoneToday?: number;
}

/** Безопасное вычисление числового выражения (только числа, ^ * · / + - скобки). */
function safeEvalNum(expr: string): number | null {
  const s = expr.trim().replace(/\s+/g, '').replace(/·/g, '*');
  if (/[a-df-zA-Z]/.test(s)) return null;
  try {
    const js = s.replace(/\^/g, '**');
    const v = new Function(`return (${js})`)();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Форматируем число для шага: целое или дробь вида -1/4. */
function formatStepNum(x: number): string {
  if (Number.isInteger(x)) return String(x);
  const denoms = [2, 3, 4, 5, 6, 8, 9, 10, 12, 16];
  for (const d of denoms) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-6) return n < 0 ? `-${Math.abs(n)}/${d}` : `${n}/${d}`;
  }
  return Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : String(x);
}

/** Шаги решения конкретного примера: по возможности считаем промежуточные значения. */
function getStepsForQuestion(q: PracticeQuestion): string[] {
  const skill = getSkillFromQuestion(q.question);
  const qn = q.question.trim();
  const qnNorm = qn.replace(/\s/g, '');
  const ans = String(q.answer ?? '').trim();

  if (skill === 'trigonometry') {
    if (/sin\s*\(\s*30\s*°?\s*\)|sin\s*\(\s*30°/.test(qn))
      return ['Шаг 1: Подставляем табличное значение sin(30°) = 1/2', `Ответ: ${ans}`];
    if (/cos\s*\(\s*60\s*°?\s*\)|cos\s*\(\s*60°/.test(qn))
      return ['Шаг 1: Подставляем cos(60°) = 1/2', `Ответ: ${ans}`];
    if (/sin\s*\(\s*45\s*°?\s*\)|sin\s*\(\s*45°/.test(qn))
      return ['Шаг 1: Подставляем sin(45°) = √2/2', `Ответ: ${ans}`];
    if (/cos\s*\(\s*45\s*°?\s*\)|cos\s*\(\s*45°/.test(qn))
      return ['Шаг 1: Подставляем cos(45°) = √2/2', `Ответ: ${ans}`];
    if (/tan\s*\(\s*45\s*°?\s*\)|tan\s*\(\s*45°/.test(qn))
      return ['Шаг 1: Подставляем tan(45°) = 1', `Ответ: ${ans}`];
    if (/sin\s*\(\s*0\s*°?\s*\)|sin\s*\(\s*0°/.test(qn))
      return ['Шаг 1: Подставляем sin(0°) = 0', `Ответ: ${ans}`];
    if (/cos\s*\(\s*0\s*°?\s*\)|cos\s*\(\s*0°/.test(qn))
      return ['Шаг 1: Подставляем cos(0°) = 1', `Ответ: ${ans}`];
    return ['Шаг 1: Применяем табличное значение синуса/косинуса/тангенса', `Ответ: ${ans}`];
  }

  if (skill === 'logarithms') {
    const mulSep = qn.includes(' · ') ? ' · ' : qn.includes(' * ') ? ' * ' : qn.includes('*') ? '*' : null;
    const parts = mulSep != null ? qn.split(mulSep).map(p => p.trim()).filter(Boolean) : [];
    if (parts.length === 2) {
      const v1 = safeEvalNum(parts[0]!);
      const v2 = safeEvalNum(parts[1]!);
      const expected = safeEvalNum(ans) ?? parseFloat(ans);
      if (v1 != null && v2 != null && !Number.isNaN(expected) && Math.abs(v1 * v2 - expected) < 1e-6) {
        const s1 = formatStepNum(v1);
        const s2 = formatStepNum(v2);
        const product = formatStepNum(v1 * v2);
        return [
          `Шаг 1: ${parts[0]} = ${s1}`,
          `Шаг 2: ${parts[1]} = ${s2}`,
          `Шаг 3: ${s1} · ${s2} = ${product}`,
          `Ответ: ${ans}`,
        ];
      }
    }
    const plusSep = qn.includes(' + ') ? ' + ' : qn.includes(' - ') ? ' - ' : null;
    if (plusSep != null) {
      const partsAdd = qn.split(plusSep).map(p => p.trim()).filter(Boolean);
      if (partsAdd.length === 2) {
        const v1 = safeEvalNum(partsAdd[0]!);
        const v2 = safeEvalNum(partsAdd[1]!);
        const expected = safeEvalNum(ans) ?? parseFloat(ans);
        const sum = plusSep === ' + ' ? (v1 != null && v2 != null ? v1 + v2 : null) : (v1 != null && v2 != null ? v1 - v2 : null);
        if (v1 != null && v2 != null && sum != null && !Number.isNaN(expected) && Math.abs(sum - expected) < 1e-6) {
          const op = plusSep === ' + ' ? '+' : '−';
          return [
            `Шаг 1: ${partsAdd[0]} = ${formatStepNum(v1)}`,
            `Шаг 2: ${partsAdd[1]} = ${formatStepNum(v2)}`,
            `Шаг 3: ${formatStepNum(v1)} ${op} ${formatStepNum(v2)} = ${formatStepNum(sum)}`,
            `Ответ: ${ans}`,
          ];
        }
      }
    }
    const logMatch = qnNorm.match(/log\[(\d+)\]\((\d+)\)/i);
    if (logMatch) {
      const base = parseInt(logMatch[1]!, 10);
      const value = parseInt(logMatch[2]!, 10);
      let exp = 0;
      let pow = 1;
      while (pow < value) { pow *= base; exp++; }
      if (pow === value && String(exp) === ans) {
        return [
          `Шаг 1: По определению логарифма: log[${base}](${value}) — степень, в которую нужно возвести ${base}, чтобы получить ${value}`,
          `Шаг 2: ${base}^(${exp}) = ${value}, значит log[${base}](${value}) = ${exp}`,
          `Ответ: ${ans}`,
        ];
      }
    }
    return [
      'Шаг 1: Представь степени в виде корней или приведи основания к одному',
      'Шаг 2: Упрости каждое слагаемое',
      'Шаг 3: Выполни сложение или умножение',
      `Ответ: ${ans}`,
    ];
  }

  if (skill === 'arithmetic') {
    const v = safeEvalNum(qn);
    const ansNum = safeEvalNum(ans) ?? parseFloat(ans);
    if (v != null && ans && !Number.isNaN(ansNum) && Math.abs(v - ansNum) < 1e-6) {
      const parts = qn.split(/[\s+\-*\/]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length === 2) {
        const a = safeEvalNum(parts[0]!);
        const b = safeEvalNum(parts[1]!);
        if (a != null && b != null) {
          if (qn.includes('+')) return [`Шаг 1: ${parts[0]} + ${parts[1]} = ${a + b}`, `Ответ: ${ans}`];
          if (qn.includes('-') && !qn.includes('*')) return [`Шаг 1: ${parts[0]} − ${parts[1]} = ${a - b}`, `Ответ: ${ans}`];
          if (qn.includes('*')) return [`Шаг 1: ${parts[0]} · ${parts[1]} = ${a * b}`, `Ответ: ${ans}`];
          if (qn.includes('/')) return [`Шаг 1: ${parts[0]} / ${parts[1]} = ${a / b}`, `Ответ: ${ans}`];
        }
      }
      if (parts.length === 3) {
        const a = safeEvalNum(parts[0]!);
        const b = safeEvalNum(parts[1]!);
        const c = safeEvalNum(parts[2]!);
        if (a != null && b != null && c != null) {
          if (qn.includes('+') && qn.includes('-')) {
            const first = a + b;
            return [`Шаг 1: ${parts[0]} + ${parts[1]} = ${first}`, `Шаг 2: ${first} − ${parts[2]} = ${first - c}`, `Ответ: ${ans}`];
          }
          if (qn.includes('*') && (qn.includes('+') || qn.includes('-'))) {
            const prod = a * b;
            const rest = qn.indexOf('*') < qn.indexOf('+') || qn.indexOf('*') < qn.indexOf('-') ? prod : safeEvalNum(parts[2]!);
            if (rest != null) return [`Шаг 1: ${parts[0]} · ${parts[1]} = ${prod}`, `Шаг 2: ${prod} + ${parts[2]} = ${prod + c}`, `Ответ: ${ans}`];
          }
        }
      }
      return [`Шаг 1: Вычисли по порядку действий (скобки, степень, · и /, затем + и −)`, `Ответ: ${ans}`];
    }
    const pctMatch = qn.match(/(\d+)\s*\*\s*(\d+)%?/);
    if (pctMatch) {
      const N = parseInt(pctMatch[1]!, 10);
      const p = parseInt(pctMatch[2]!, 10);
      const res = Math.round((N * p) / 100);
      if (String(res) === ans) {
        return [`Шаг 1: ${p}% = ${p}/100`, `Шаг 2: ${N} · ${p}/100 = ${N * p}/100 = ${res}`, `Ответ: ${ans}`];
      }
    }
    return [
      'Шаг 1: Выполни действие в скобках (если есть)',
      'Шаг 2: Выполни умножение и деление',
      'Шаг 3: Выполни сложение и вычитание',
      `Ответ: ${ans}`,
    ];
  }

  if (skill === 'equations') {
    const systemMatch = qnNorm.match(/system\{x\+y=(\d+);x-y=(\d+)\}/i);
    if (systemMatch) {
      const A = parseInt(systemMatch[1]!, 10);
      const B = parseInt(systemMatch[2]!, 10);
      const yVal = (A - B) / 2;
      const xVal = yVal + B;
      const yInt = Math.round(yVal);
      const xInt = Math.round(xVal);
      if (Math.abs(yVal - yInt) < 1e-6 && Math.abs(xVal - xInt) < 1e-6) {
        return [
          `Шаг 1: x+y=${A}; из второго x−y=${B} получаем x=y+${B}`,
          `Шаг 2: Подставляем: (y+${B})+y=${A}`,
          `Шаг 3: 2y+${B}=${A} ⇒ 2y=${A - B}`,
          `Шаг 4: y=${yInt}`,
          `Шаг 5: x=${yInt}+${B}=${xInt}`,
          `Ответ: х=${xInt}, у=${yInt}`,
        ];
      }
    }
    const systemCoeffMatch = qnNorm.match(/system\{(\d+)x\+(\d+)y=(\d+);(\d+)x-(\d+)y=(\d+)\}/i);
    if (systemCoeffMatch) {
      const m = parseInt(systemCoeffMatch[1]!, 10);
      const n = parseInt(systemCoeffMatch[2]!, 10);
      const A = parseInt(systemCoeffMatch[3]!, 10);
      const m2 = parseInt(systemCoeffMatch[4]!, 10);
      const n2 = parseInt(systemCoeffMatch[5]!, 10);
      const B = parseInt(systemCoeffMatch[6]!, 10);
      if (m === m2 && n === n2) {
        const xVal = (A + B) / (2 * m);
        const yVal = (A - B) / (2 * n);
        if (Math.abs(xVal - Math.round(xVal)) < 1e-6 && Math.abs(yVal - Math.round(yVal)) < 1e-6) {
          const xInt = Math.round(xVal);
          const yInt = Math.round(yVal);
          return [
            `Шаг 1: Сложим уравнения: ${2 * m}x = ${A + B} ⇒ x = ${xInt}`,
            `Шаг 2: Вычтем: ${2 * n}y = ${A - B} ⇒ y = ${yInt}`,
            `Ответ: x=${xInt}, y=${yInt}`,
          ];
        }
      }
    }
    const x2eqMatch = qnNorm.match(/x\^?\(?2\)?\s*=\s*(\d+)/i);
    if (x2eqMatch) {
      const k = parseInt(x2eqMatch[1]!, 10);
      if (k > 0) {
        const r = Math.sqrt(k);
        if (Number.isInteger(r)) return [`Шаг 1: x² = ${k} ⇒ x = ±√${k}`, `Шаг 2: x₁ = ${r}, x₂ = −${r}`, `Ответ: ${r},−${r}`];
      }
    }
    const x2plusMatch = qnNorm.match(/x\^?\(?2\)?\s*\+\s*(\d+)\s*=\s*(\d+)/i);
    if (x2plusMatch) {
      const add = parseInt(x2plusMatch[1]!, 10);
      const rhs = parseInt(x2plusMatch[2]!, 10);
      const k = rhs - add;
      if (k > 0) {
        const r = Math.sqrt(k);
        if (Number.isInteger(r)) return [`Шаг 1: x² + ${add} = ${rhs} ⇒ x² = ${rhs} − ${add} = ${k}`, `Шаг 2: x = ±√${k} ⇒ x₁ = ${r}, x₂ = −${r}`, `Ответ: ${r},−${r}`];
      }
    }
    const quadMatch = qnNorm.match(/(\d+)x\^?\(?2\)?[+](\d+)x[+](\d+)=0/i) ?? qnNorm.match(/(\d+)x\^?\(?2\)?[-](\d+)x([+-]\d+)=0/i);
    if (quadMatch) {
      const a = parseInt(quadMatch[1]!, 10);
      const b = quadMatch[2]!.startsWith('-') ? -parseInt(quadMatch[2]!.slice(1), 10) : parseInt(quadMatch[2]!, 10);
      const c = quadMatch[3]!.startsWith('-') ? -parseInt(quadMatch[3]!.slice(1), 10) : parseInt(quadMatch[3]!, 10);
      const D = b * b - 4 * a * c;
      if (D >= 0) {
        const r1 = (-b + Math.sqrt(D)) / (2 * a);
        const r2 = (-b - Math.sqrt(D)) / (2 * a);
        const roots = [r1, r2].sort((u, v) => u - v);
        const ansParts = ans.split(',').map(s => parseFloat(s.trim()));
        if (ansParts.length === 2 && Math.abs(roots[0]! - ansParts[0]!) < 1e-6 && Math.abs(roots[1]! - ansParts[1]!) < 1e-6) {
          return [
            `Шаг 1: Дискриминант D = b² − 4ac = ${b}² − 4·${a}·${c} = ${D}`,
            `Шаг 2: x₁ = (−b + √D)/(2a) = (${-b} + √${D})/(2·${a}) = ${formatStepNum(r1)}`,
            `Шаг 3: x₂ = (−b − √D)/(2a) = (${-b} − √${D})/(2·${a}) = ${formatStepNum(r2)}`,
            `Ответ: ${ans}`,
          ];
        }
      }
    }
    const quadA1Match = qnNorm.match(/x\^?\(?2\)?([+-]?\d*)x([+-]?\d+)=0/i);
    if (quadA1Match) {
      const bStr = quadA1Match[1]!.replace('+', '') || '1';
      const b = bStr === '-' ? -1 : parseInt(bStr, 10);
      const cStr = quadA1Match[2]!.replace('+', '');
      const c = cStr === '-' ? -1 : parseInt(cStr, 10);
      const D = b * b - 4 * c;
      if (D >= 0) {
        const r1 = (-b + Math.sqrt(D)) / 2;
        const r2 = (-b - Math.sqrt(D)) / 2;
        const ansParts = ans.split(',').map(s => parseFloat(s.trim()));
        if (ansParts.length === 2 && Math.abs(r1 - ansParts[0]!) < 1e-6 && Math.abs(r2 - ansParts[1]!) < 1e-6) {
          return [
            `Шаг 1: Уравнение x² + ${b}x + ${c} = 0. D = b² − 4c = ${b}² − 4·${c} = ${D}`,
            `Шаг 2: x₁ = (−${b} + √${D})/2 = ${formatStepNum(r1)}, x₂ = (−${b} − √${D})/2 = ${formatStepNum(r2)}`,
            `Ответ: ${ans}`,
          ];
        }
      }
    }
    const linearMatch = qnNorm.match(/^(\d+)x\s*\+\s*(\d+)\s*=\s*(\d+)$/);
    if (linearMatch) {
      const a = parseInt(linearMatch[1]!, 10);
      const b = parseInt(linearMatch[2]!, 10);
      const c = parseInt(linearMatch[3]!, 10);
      const xVal = (c - b) / a;
      if (Math.abs(xVal - Math.round(xVal)) < 1e-6 && String(Math.round(xVal)) === ans) {
        const xInt = Math.round(xVal);
        return [`Шаг 1: ${a}x = ${c} − ${b} = ${c - b}`, `Шаг 2: x = (${c - b})/${a} = ${xInt}`, `Ответ: ${xInt}`];
      }
    }
    const linearBothMatch = qnNorm.match(/^(\d+)x\s*\+\s*(\d+)\s*=\s*(\d+)x\s*\+\s*(\d+)$/);
    if (linearBothMatch) {
      const a = parseInt(linearBothMatch[1]!, 10);
      const b = parseInt(linearBothMatch[2]!, 10);
      const c = parseInt(linearBothMatch[3]!, 10);
      const d = parseInt(linearBothMatch[4]!, 10);
      if (a !== c) {
        const xVal = (d - b) / (a - c);
        if (Math.abs(xVal - Math.round(xVal)) < 1e-6 && String(Math.round(xVal)) === ans) {
          const xInt = Math.round(xVal);
          return [
            `Шаг 1: Перенос: ${a}x − ${c}x = ${d} − ${b}`,
            `Шаг 2: (${a}−${c})x = ${d - b} ⇒ ${a - c}x = ${d - b}`,
            `Шаг 3: x = (${d - b})/(${a - c}) = ${xInt}`,
            `Ответ: ${xInt}`,
          ];
        }
      }
    }
    const fracMatch = qnNorm.match(/frac\{x\}\{(\d+)\}\s*\+\s*(\d+)\s*=\s*(\d+)/);
    if (fracMatch) {
      const a = parseInt(fracMatch[1]!, 10);
      const b = parseInt(fracMatch[2]!, 10);
      const c = parseInt(fracMatch[3]!, 10);
      const xVal = (c - b) * a;
      if (Math.abs(xVal - Math.round(xVal)) < 1e-6 && String(Math.round(xVal)) === ans) {
        const xInt = Math.round(xVal);
        return [`Шаг 1: x/${a} = ${c} − ${b} = ${c - b}`, `Шаг 2: x = (${c - b}) · ${a} = ${xInt}`, `Ответ: ${xInt}`];
      }
    }
    const biquadMatch = qnNorm.match(/\(x\^?\(?2\)?-5\)\^?\(?4\)?-\s*\(x\^?\(?2\)?-5\)\^?\(?2\)?=12/i);
    if (biquadMatch) {
      return [
        'Шаг 1: Подстановка y = (x²−5)² ⇒ y² − y = 12',
        'Шаг 2: y₁ + y₂ = 1, y₁·y₂ = −12 ⇒ y₁ = −3, y₂ = 4',
        'Шаг 3: (x²−5)² = 4 (случай −3 невозможен: квадрат ≥ 0)',
        'Шаг 4: x² − 5 = 2 или x² − 5 = −2 ⇒ x² = 7 или x² = 3',
        'Шаг 5: x = ±√7 или x = ±√3',
        'Ответ: x₁ = √7, x₂ = −√7, x₃ = √3, x₄ = −√3',
      ];
    }
    return [
      'Шаг 1: Перенеси слагаемые с x в одну сторону, числа в другую (при переносе меняй знак)',
      'Шаг 2: Приведи подобные и раздели на коэффициент при x',
      `Ответ: ${ans}`,
    ];
  }

  const v = safeEvalNum(qn);
  if (v != null && ans && Math.abs(v - (safeEvalNum(ans) ?? parseFloat(ans))) < 1e-6)
    return [`Шаг 1: Упрости выражение`, `Ответ: ${ans}`];
  return [
    'Шаг 1: Выполни первое упрощение',
    'Шаг 2: Выполни второе действие',
    `Ответ: ${ans}`,
  ];
}

/** Ключ подсказки Algor в зависимости от типа ошибки (для уникального комментария). */
function getAlgorFeedbackKey(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  skill: SkillKey
): string {
  const u = String(userAnswer ?? '').trim();
  const e = String(expectedAnswer ?? '').trim();
  const numU = parseFloat(u.replace(/\s/g, '').replace(',', '.'));
  const numE = parseFloat(e.replace(/\s/g, '').replace(',', '.'));

  const isEquationLike = /=/.test(question) && /[xy]/.test(question);
  const effectiveSkill = isEquationLike ? 'equations' as const : skill;

  if (effectiveSkill === 'equations') {
    if (!Number.isNaN(numU) && !Number.isNaN(numE) && numU === -numE)
      return 'practice.feedback_almost_sign';
    return 'practice.feedback_almost_equation';
  }
  if (effectiveSkill === 'trigonometry') return 'practice.feedback_almost_trig';
  if (effectiveSkill === 'arithmetic') return 'practice.feedback_almost_arithmetic';
  if (effectiveSkill === 'logarithms') return 'practice.feedback_almost_log';
  return 'practice.feedback_almost';
}

const PracticeScreen: React.FC<PracticeScreenProps> = ({
  session,
  onAnswer,
  onBack,
}) => {
  const { t, language } = useLocalization();
  const [userAnswer, setUserAnswer] = useState('');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [userAnswer2, setUserAnswer2] = useState('');
  const [cursorIndex2, setCursorIndex2] = useState(0);
  const [userAnswer3, setUserAnswer3] = useState('');
  const [cursorIndex3, setCursorIndex3] = useState(0);
  const [userAnswer4, setUserAnswer4] = useState('');
  const [cursorIndex4, setCursorIndex4] = useState(0);
  const [focusedField, setFocusedField] = useState<0 | 1 | 2 | 3>(0);
  const [showAdvancedKeyboard, setShowAdvancedKeyboard] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showSolutionSteps, setShowSolutionSteps] = useState(false);
  const [revealedStepIndex, setRevealedStepIndex] = useState(-1);
  const [aiSolutionSteps, setAiSolutionSteps] = useState<string | null>(null);
  const [aiSolutionLoading, setAiSolutionLoading] = useState(false);
  const [aiSolutionFailed, setAiSolutionFailed] = useState(false);
  const [revealedAiStepCount, setRevealedAiStepCount] = useState(0);
  const [problemKey, setProblemKey] = useState(0);

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const answerStr = String(currentQuestion?.answer ?? '').trim();
  const twoRootsFromQuestion = getTwoRootsFromQuestion(currentQuestion?.question);
  const twoIntervalsAnswer = isTwoIntervalsAnswer(answerStr);
  const answerPartCount = answerStr.includes(',') ? answerStr.split(',').map(s => s.trim()).filter(Boolean).length : 0;
  const isMultiAnswer = answerStr.includes(',') || twoRootsFromQuestion != null || twoIntervalsAnswer;
  const isInequality = currentQuestion ? /[<>≤≥]/.test(currentQuestion.question) : false;
  const showFourFields = isMultiAnswer && !isInequality && !twoIntervalsAnswer && answerPartCount >= 4;
  const showThreeFields = isMultiAnswer && !isInequality && !twoIntervalsAnswer && answerPartCount === 3;
  const showTwoFields = (isMultiAnswer && !isInequality && answerPartCount === 2) || twoIntervalsAnswer;
  const isSystemOfEquations = /system\{/.test(currentQuestion?.question ?? '');
  const twoIntervalParts = twoIntervalsAnswer ? answerStr.split(/\s+[U∪]\s+/).map((p) => p.trim()).filter(Boolean) : [];
  const multiFieldLabel1 = twoIntervalsAnswer && twoIntervalParts.length === 2 ? twoIntervalParts[0]! : (isSystemOfEquations ? 'x' : 'x₁');
  const multiFieldLabel2 = twoIntervalsAnswer && twoIntervalParts.length === 2 ? twoIntervalParts[1]! : (isSystemOfEquations ? 'y' : 'x₂');
  const steps = currentQuestion ? getStepsForQuestion(currentQuestion) : [];
  const hintSkill = currentQuestion ? getSkillFromQuestion(currentQuestion.question) : 'arithmetic';
  const hintFormulas = currentQuestion ? getFormulasForQuestion(currentQuestion.question, hintSkill, { difficulty: currentQuestion.difficulty }) : [];

  useEffect(() => {
    setUserAnswer('');
    setCursorIndex(0);
    setUserAnswer2('');
    setCursorIndex2(0);
    setUserAnswer3('');
    setCursorIndex3(0);
    setUserAnswer4('');
    setCursorIndex4(0);
    setFocusedField(0);
    setFeedback(null);
    setShowSolutionSteps(false);
    setRevealedStepIndex(-1);
    setAiSolutionSteps(null);
    setAiSolutionLoading(false);
    setAiSolutionFailed(false);
    setRevealedAiStepCount(0);
    setProblemKey(k => k + 1);
  }, [session.currentQuestionIndex]);

  const stepsBlockVisible = showSolutionSteps || (feedback === 'incorrect' && revealedStepIndex >= 0);
  useEffect(() => {
    if (!stepsBlockVisible || !currentQuestion || aiSolutionSteps != null || aiSolutionLoading) return;
    setAiSolutionFailed(false);
    setAiSolutionLoading(true);
    solveMathProblemFromText(currentQuestion.question, language)
      .then((result) => {
        const text = result.startsWith('error.') ? t(result) : result;
        setAiSolutionSteps(text);
      })
      .catch(() => setAiSolutionFailed(true))
      .finally(() => setAiSolutionLoading(false));
  }, [stepsBlockVisible, currentQuestion?.question, language, t, aiSolutionSteps, aiSolutionLoading]);

  useEffect(() => {
    if (feedback && currentQuestion) {
      const hintUsed = showSolutionSteps || revealedStepIndex >= 0;
      const stepsRevealedCount = revealedStepIndex >= 0 ? revealedStepIndex + 1 : 0;
      const meta = { hintUsed, difficulty: currentQuestion.difficulty, stepsRevealedCount };
      const rawAnswer = showFourFields ? [userAnswer, userAnswer2, userAnswer3, userAnswer4].map(s => s.trim()).join(',') : showThreeFields ? [userAnswer, userAnswer2, userAnswer3].map(s => s.trim()).join(',') : showTwoFields && twoIntervalsAnswer ? [userAnswer.trim(), userAnswer2.trim()].join(' U ') : showTwoFields ? [userAnswer.trim(), userAnswer2.trim()].join(',') : userAnswer;
      const timer = setTimeout(() => {
        onAnswer(feedback === 'correct', currentQuestion.question, meta, rawAnswer);
      }, feedback === 'correct' ? 2200 : 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, onAnswer, currentQuestion, showSolutionSteps, revealedStepIndex, showTwoFields, showThreeFields, showFourFields, twoIntervalsAnswer, userAnswer, userAnswer2, userAnswer3, userAnswer4]);

  const normalizeAnswer = (s: string): string => {
    const str = typeof s === 'string' ? s : String(s ?? '');
    let out = str.replace(/\s*x\s*=\s*/gi, '').trim();
    // Убрать префикс вида sin60=, sin 60°=, cos30= чтобы «sin60=√[2](3)/2» → «sqrt(3)/2»
    out = out.replace(/^\s*[a-zA-Z0-9°()\s]+=\s*/i, '').trim();
    out = out.replace(/frac\s*\{\s*([^{}]*)\s*\}\s*\{\s*([^{}]*)\s*\}/gi, (_, num, den) => `${num.trim()}/${den.trim()}`);
    out = out.replace(/\s*\/\s*/g, '/');
    // √[2](x) или sqrt[2](x) — квадратный корень, приводим к sqrt(x)
    out = out.replace(/(?:\u221A|√)\s*\[\s*2\s*\]\s*\(([^)]*)\)/g, 'sqrt($1)');
    out = out.replace(/sqrt\s*\[\s*2\s*\]\s*\(([^)]*)\)/g, 'sqrt($1)');
    out = out.replace(/\u221A/g, 'sqrt').replace(/√/g, 'sqrt');
    out = out.replace(/sqrt(\d+)(?!\()/g, (_, d) => `sqrt(${d})`);
    // Бесконечность: беск, inf, ∞ — к одному виду для сравнения интервалов; +∞ и ∞ считаем одинаковыми
    out = out.replace(/[+−-]?\s*беск\s*/gi, (m) => (/^[-−]/.test(m.trim()) ? '-∞' : '∞'));
    out = out.replace(/[+−-]?\s*inf(inity)?\s*/gi, (m) => (/^[-−]/.test(m.trim()) ? '-∞' : '∞'));
    out = out.replace(/\+\s*∞/g, '∞').replace(/\s*∞\s*/g, '∞');
    // Объединение интервалов: ∪ и U к одному виду для сравнения
    out = out.replace(/\s*∪\s*/g, 'u').replace(/\s+u\s+/gi, 'u');
    out = out.toLowerCase().replace(/\s/g, '');
    // Числовой ответ: 44.0 / 44,0 → 44, чтобы засчитывать целые числа в любом формате
    const numMatch = out.match(/^(-?\d+)[.,]0+$/);
    if (numMatch) out = numMatch[1]!;
    return out;
  };

  const handleSubmit = (overrideAnswer?: string) => {
    if (!currentQuestion || feedback) return;
    // onClick кнопки «Вычислить» передаёт event; используем override только если это строка (например handleSubmit('∅'))
    const raw = typeof overrideAnswer === 'string' ? overrideAnswer : (showFourFields ? [userAnswer, userAnswer2, userAnswer3, userAnswer4].map(s => s.trim()).join(',') : showThreeFields ? [userAnswer, userAnswer2, userAnswer3].map(s => s.trim()).join(',') : showTwoFields && twoIntervalsAnswer ? [userAnswer.trim(), userAnswer2.trim()].join(' U ') : showTwoFields ? [userAnswer.trim(), userAnswer2.trim()].join(',') : userAnswer);
    const toCheckStr = typeof raw === 'string' ? raw : String(raw ?? '');
    if (!toCheckStr.trim()) return;
    const accepted = [
      answerStr,
      ...(currentQuestion.acceptedAnswers || []).map((a: unknown) => (typeof a === 'string' ? a : String(a ?? ''))),
      ...(normalizeAnswer(answerStr) === 'r' ? ['(-∞,+∞)'] : []),
    ].map(normalizeAnswer).filter(Boolean);
    let userNorm: string;
    let expected: string;
    let isCorrect: boolean;
    if (twoIntervalsAnswer) {
      userNorm = normalizeAnswer(toCheckStr);
      expected = normalizeAnswer(answerStr);
      isCorrect = userNorm === expected || accepted.includes(userNorm);
    } else {
      userNorm = toCheckStr.includes(',') ? toCheckStr.split(',').map(normalizeAnswer).filter(Boolean).sort().join(',') : normalizeAnswer(toCheckStr);
      const multiAnswerSource = twoRootsFromQuestion ?? answerStr;
      expected = isMultiAnswer
        ? multiAnswerSource.split(',').map(normalizeAnswer).filter(Boolean).sort().join(',')
        : normalizeAnswer(answerStr);
      if (isMultiAnswer) {
        isCorrect = userNorm === expected;
      } else {
      const exactMatch = userNorm === expected;
      const toNum = (t: string) => parseFloat(t.replace(',', '.').trim());
      const userNum = toNum(userNorm);
      const expectedNum = toNum(expected);
      const numericMatch = !userNorm.includes('%') && !Number.isNaN(userNum) && !Number.isNaN(expectedNum) && Math.abs(userNum - expectedNum) < 1e-9;
      isCorrect = exactMatch || numericMatch || accepted.includes(userNorm);
      }
    }
    setFeedback(isCorrect ? 'correct' : 'incorrect');
  };

  const currentValue = showFourFields
    ? (focusedField === 0 ? userAnswer : focusedField === 1 ? userAnswer2 : focusedField === 2 ? userAnswer3 : userAnswer4)
    : showThreeFields ? (focusedField === 0 ? userAnswer : focusedField === 1 ? userAnswer2 : userAnswer3) : showTwoFields && focusedField === 1 ? userAnswer2 : userAnswer;
  const currentCursor = showFourFields
    ? (focusedField === 0 ? cursorIndex : focusedField === 1 ? cursorIndex2 : focusedField === 2 ? cursorIndex3 : cursorIndex4)
    : showThreeFields ? (focusedField === 0 ? cursorIndex : focusedField === 1 ? cursorIndex2 : cursorIndex3) : showTwoFields && focusedField === 1 ? cursorIndex2 : cursorIndex;
  const setCurrentValue = showFourFields
    ? (focusedField === 0 ? setUserAnswer : focusedField === 1 ? setUserAnswer2 : focusedField === 2 ? setUserAnswer3 : setUserAnswer4)
    : showThreeFields ? (focusedField === 0 ? setUserAnswer : focusedField === 1 ? setUserAnswer2 : setUserAnswer3) : showTwoFields && focusedField === 1 ? setUserAnswer2 : setUserAnswer;
  const setCurrentCursor = showFourFields
    ? (focusedField === 0 ? setCursorIndex : focusedField === 1 ? setCursorIndex2 : focusedField === 2 ? setCursorIndex3 : setCursorIndex4)
    : showThreeFields ? (focusedField === 0 ? setCursorIndex : focusedField === 1 ? setCursorIndex2 : setCursorIndex3) : showTwoFields && focusedField === 1 ? setCursorIndex2 : setCursorIndex;

  const insertAtCursor = (text: string) => {
    const maxLen = 200;
    if (currentValue.length + text.length > maxLen) return;
    const next = currentValue.slice(0, currentCursor) + text + currentValue.slice(currentCursor);
    setCurrentValue(next);
    setCurrentCursor(prev => prev + text.length);
  };

  const handleKeyPress = (key: string) => {
    if (feedback) return;
    if (key === 'left') {
      setCurrentCursor(getLogicalCursorLeft(currentValue, currentCursor));
    } else if (key === 'right') {
      setCurrentCursor(getLogicalCursorRight(currentValue, currentCursor));
    } else if (key === 'backspace') {
      if (currentCursor > 0) {
        const range = getBackspaceDeletionRange(currentValue, currentCursor);
        if (range) {
          setCurrentValue(currentValue.slice(0, range.start) + currentValue.slice(range.end));
          setCurrentCursor(range.start);
        } else {
          setCurrentValue(currentValue.slice(0, currentCursor - 1) + currentValue.slice(currentCursor));
          setCurrentCursor(currentCursor - 1);
        }
      }
    } else if (key === 'AC') {
      setCurrentValue('');
      setCurrentCursor(0);
    } else if (key === '=') {
      handleSubmit();
    } else {
      switch (key) {
        case 'x²': {
          const s2 = currentValue.slice(0, currentCursor) + '^(2)' + currentValue.slice(currentCursor);
          if (s2.length <= 200) { setCurrentValue(s2); setCurrentCursor(currentCursor); }
          break;
        }
        case 'x³': {
          const s3 = currentValue.slice(0, currentCursor) + '^(3)' + currentValue.slice(currentCursor);
          if (s3.length <= 200) { setCurrentValue(s3); setCurrentCursor(currentCursor); }
          break;
        }
        case 'xⁿ': {
          const s = currentValue.slice(0, currentCursor) + '^()' + currentValue.slice(currentCursor);
          if (s.length <= 200) { setCurrentValue(s); setCurrentCursor(currentCursor + 2); }
          break;
        }
        case '√':
          insertAtCursor('√()');
          setCurrentCursor(currentCursor + 2);
          break;
        case '³√':
          insertAtCursor('√[3]()');
          setCurrentCursor(currentCursor + 5);
          break;
        case 'ⁿ√':
          insertAtCursor('√[]()');
          setCurrentCursor(currentCursor + 2);
          break;
        case 'a/b':
          insertAtCursor('frac{}{}');
          setCurrentCursor(currentCursor + FRAC_INSERT_CURSOR_OFFSET);
          break;
        case 'mixfrac': insertAtCursor('mixfrac{}{}{}'); break;
        case 'system': insertAtCursor('system{;}'); break;
        case '÷': insertAtCursor('/'); break;
        case '×': insertAtCursor('*'); break;
        case 'log': {
          const s = currentValue.slice(0, currentCursor) + 'log[]()' + currentValue.slice(currentCursor);
          if (s.length <= 200) { setCurrentValue(s); setCurrentCursor(currentCursor + 4); }
          break;
        }
        case 'lg': {
          const s = currentValue.slice(0, currentCursor) + 'log[10]()' + currentValue.slice(currentCursor);
          if (s.length <= 200) { setCurrentValue(s); setCurrentCursor(currentCursor + 6); }
          break;
        }
        case 'ln': {
          const s = currentValue.slice(0, currentCursor) + 'log[e]()' + currentValue.slice(currentCursor);
          if (s.length <= 200) { setCurrentValue(s); setCurrentCursor(currentCursor + 5); }
          break;
        }
        case 'sin':
        case 'cos':
        case 'tan':
        case 'ctg':
        case 'arcsin':
        case 'arccos':
        case 'arctan':
        case 'arcctg': {
          const template = key + '()';
          const s = currentValue.slice(0, currentCursor) + template + currentValue.slice(currentCursor);
          if (s.length <= 200) { setCurrentValue(s); setCurrentCursor(currentCursor + key.length); }
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
          insertAtCursor(key);
          break;
        default:
          if (key === '>=' || key === '<=' || (key.length >= 1 && /^[xy\d.\-\+\/()%,<> ]+$/.test(key))) insertAtCursor(key);
          break;
      }
    }
  };

  const revealNextStep = () => {
    if (revealedStepIndex < steps.length - 1) setRevealedStepIndex(i => i + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F1A] text-white">
      {/* Top Bar — назад: если открыты подсказки — закрыть их, иначе выход в режим практики */}
      <header className="px-4 pt-safe pb-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={() => {
                if (showSolutionSteps || revealedStepIndex >= 0) {
                  setShowSolutionSteps(false);
                  setRevealedStepIndex(-1);
                } else {
                  onBack();
                }
              }}
              aria-label="Back"
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <span className="text-[10px] text-[#9AA3B2] tabular-nums">{session.currentQuestionIndex + 1}/{session.stats.total}</span>
        </div>
      </header>

      {/* Problem Card — #121826, soft glow #5B8CFF15, radius 28px, 32px math, 200ms fade+slide */}
      <main className="flex-1 flex flex-col justify-center items-center px-5 -mt-4">
        <div className="flex items-center gap-2 w-full max-w-md mb-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 border border-white/10">
            <span>{SKILL_ICON[getSkillFromQuestion(currentQuestion.question)]}</span>
            <span>{t(`dashboard.skill_${getSkillFromQuestion(currentQuestion.question)}`)}</span>
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 border border-white/10">
            {(() => {
              const key = `practice.tier_${currentQuestion.difficulty}`;
              const label = t(key);
              return label !== key ? label : (TIER_NAMES[currentQuestion.difficulty] ?? String(currentQuestion.difficulty));
            })()}
          </span>
        </div>
        <div
          key={problemKey}
          className="relative w-full max-w-md rounded-[28px] py-4 px-5 min-h-[88px] max-h-[280px] flex items-center justify-center border transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 overflow-hidden"
          style={{
            background: '#121826',
            borderColor: feedback === 'correct' ? 'rgba(34, 197, 94, 0.4)' : feedback === 'incorrect' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(91, 140, 255, 0.08)',
            boxShadow: feedback === 'correct' ? '0 0 40px 12px rgba(34, 197, 94, 0.2)' : feedback === 'incorrect' ? '0 0 30px 8px rgba(239, 68, 68, 0.15)' : '0 0 24px 4px rgba(91, 140, 255, 0.06)',
          }}
        >
          <div className="text-center min-w-0 w-full overflow-x-auto overflow-y-auto py-1 space-y-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {splitEquationForDisplay(currentQuestion.question).map((line, i) => (
              <div key={i} className="text-lg font-bold tracking-tight text-[#E6E9F2] leading-snug min-h-[2rem] flex justify-center">
                <MathRenderer expression={line} displayMode className="text-[#E6E9F2]" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-5 pb-safe">
        {showSolutionSteps || (feedback === 'incorrect' && revealedStepIndex >= 0) ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 animate-in fade-in duration-300 max-h-[50vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <p className="text-xs font-bold text-[#9AA3B2] uppercase tracking-wider mb-3">{t('practice.solution_steps_title')}</p>
            {hintFormulas.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-[#5B8CFF] uppercase tracking-wider">{t('practice.formulas')}</p>
                <div className="flex flex-col gap-2">
                  {hintFormulas.map((item, i) => {
                    const lines = (typeof item.expr === 'string' ? item.expr : String(item.expr ?? '')).split(/\s*\|\s*/).filter(Boolean);
                    return (
                      <div key={i} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 space-y-1">
                        {lines.map((line, j) => (
                          <div key={j} className="min-w-0 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <MathRenderer expression={line.trim()} displayMode className="text-base text-[#E6E9F2]" />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Пошаговое решение от ИИ — по одному шагу по нажатию кнопки */}
            {aiSolutionSteps ? (() => {
              const { steps } = splitAiSolutionIntoSteps(aiSolutionSteps);
              // Первый и все шаги показываем только по нажатию кнопки. Введение не показываем.
              const visibleCount = revealedAiStepCount;
              const visibleSteps = steps.slice(0, visibleCount);
              const hasMore = visibleCount < steps.length;
              const contentToShow = visibleSteps.length > 0 ? visibleSteps.join('\n\n') : '';
              return (
                <div className="border-t border-white/10 pt-3 space-y-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#5B8CFF]/80 mb-2">{(() => {
                    const v = t('practice.solution_steps_ai_label');
                    if (v !== 'practice.solution_steps_ai_label') return v;
                    return language === 'ru' ? 'Пошаговое решение от ИИ' : language === 'es' ? 'Solución paso a paso por IA' : 'Step-by-step solution by AI';
                  })()}</p>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setRevealedAiStepCount(c => Math.min(c + 1, steps.length))}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#5B8CFF] border border-[#5B8CFF]/40 bg-[#5B8CFF]/10 mb-3 transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[#5B8CFF]/20 hover:border-[#5B8CFF]/60 hover:shadow-[0_0_20px_rgba(91,140,255,0.25)] active:scale-[0.98] active:bg-[#5B8CFF]/25 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      {t('practice.reveal_next_step')}
                    </button>
                  )}
                  <div className="space-y-1">
                    {renderSolutionContent(contentToShow)}
                  </div>
                </div>
              );
            })() : aiSolutionFailed ? (
              <>
                <p className="text-xs text-[#9AA3B2] mb-2">{t('practice.solution_steps_ai_fallback')}</p>
                <button
                  type="button"
                  onClick={() => setRevealedStepIndex(revealedStepIndex < 0 ? 0 : Math.min(revealedStepIndex + 1, steps.length - 1))}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#5B8CFF] border border-[#5B8CFF]/40 bg-[#5B8CFF]/10 mb-3"
                >
                  {revealedStepIndex < 0 ? t('practice.show_solution_steps') : t('practice.reveal_next_step')}
                </button>
                <div className="border-t border-white/10 pt-3 space-y-1 min-w-0">
                  {renderSolutionContent(stepsToMarkdown(steps.slice(0, revealedStepIndex + 1)))}
                </div>
              </>
            ) : (
              <div className="flex gap-2 items-center py-4 text-sm text-[#9AA3B2]">
                <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-[#5B8CFF]" />
                <span>{t('practice.review_loading') === 'practice.review_loading' ? (language === 'ru' ? 'Генерация решения...' : language === 'es' ? 'Generando solución...' : 'Generating solution...') : t('practice.review_loading')}</span>
              </div>
            )}
          </div>
        ) : feedback === 'correct' && currentQuestion ? (
          (() => {
            const revealedStepCount = revealedStepIndex >= 0 ? revealedStepIndex + 1 : 0;
            const tierMult = getTierMultiplier(currentQuestion.difficulty);
            const hintMult = getHintMultiplierFromSteps(revealedStepCount);
            const earnedXp = Math.round(BASE_XP_PRACTICE * tierMult * hintMult);
            const earnedBp = Math.round(BASE_BP_PRACTICE * tierMult * hintMult);
            const consecutiveInRow = (session.consecutiveCorrect ?? 0) + 1;
            return (
              <div className="text-center py-4 animate-in fade-in duration-300 space-y-1">
                <p className="text-xl font-bold text-[#22C55E]">{t('practice.feedback_correct')}</p>
                <p className="text-sm font-semibold text-[#5B8CFF]" style={{ textShadow: '0 0 10px rgba(91, 140, 255, 0.5)' }}>+{earnedXp} Brain XP · +{earnedBp} BP</p>
                <p className="text-xs text-[#9AA3B2]">{t('practice.feedback_streak')}: {consecutiveInRow}</p>
              </div>
            );
          })()
        ) : feedback === 'incorrect' ? (
          (() => {
            const combinedAnswer = showFourFields ? [userAnswer, userAnswer2, userAnswer3, userAnswer4].join(', ') : showThreeFields ? [userAnswer, userAnswer2, userAnswer3].join(', ') : showTwoFields && twoIntervalsAnswer ? [userAnswer, userAnswer2].join(' U ') : showTwoFields ? [userAnswer, userAnswer2].join(', ') : userAnswer;
            const algorKey = currentQuestion
              ? getAlgorFeedbackKey(currentQuestion.question, String(currentQuestion.answer ?? ''), combinedAnswer, hintSkill)
              : 'practice.feedback_almost';
            return (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <TutorAvatarIcon variant="tutor" className="w-8 h-8 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#E6E9F2]">Algor:</p>
                <p className="text-sm text-[#9AA3B2]">{t(algorKey)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSolutionSteps(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-[#5B8CFF] border border-[#5B8CFF]/40 bg-[#5B8CFF]/10"
            >
              {t('practice.show_solution_steps')}
            </button>
          </div>
            );
          })()
        ) : (
          <>
            <div className={showFourFields ? 'mb-2 grid grid-cols-4 gap-1.5' : showThreeFields ? 'mb-2 grid grid-cols-3 gap-1.5' : showTwoFields ? 'mb-2 grid grid-cols-2 gap-2' : 'mb-2'}>
              {showFourFields ? (
                [0, 1, 2, 3].map((i) => {
                  const val = i === 0 ? userAnswer : i === 1 ? userAnswer2 : i === 2 ? userAnswer3 : userAnswer4;
                  const cur = i === 0 ? cursorIndex : i === 1 ? cursorIndex2 : i === 2 ? cursorIndex3 : cursorIndex4;
                  return (
                    <div key={i} className="flex flex-col min-w-0">
                      <span className="text-[10px] text-white/50 block mb-0.5">x{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFocusedField(i as 0 | 1 | 2 | 3)}
                        className={`w-full min-h-[52px] text-left rounded-lg p-2 bg-[#1a1a24]/30 border shadow-[0 0 15px_rgba(58,141,255,0.2)] flex flex-col justify-end transition-all ring-offset-2 ring-offset-[#0B0F1A] border-white/10 ring-2 ${focusedField === i ? 'ring-[#5B8CFF]/40 border-[#5B8CFF]/40' : 'ring-transparent'}`}
                      >
                        <div className="min-h-[36px] text-lg text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-1" style={{ lineHeight: 1.4 }}>
                          {!val && <span className="text-white/30">0</span>}
                          {val ? (
                            <ExpressionWithCursorDisplay
                              expression={val}
                              cursorPosition={cur}
                              showCursor={focusedField === i}
                            />
                          ) : (
                            <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              ) : showThreeFields ? (
                [0, 1, 2].map((i) => {
                  const val = i === 0 ? userAnswer : i === 1 ? userAnswer2 : userAnswer3;
                  const cur = i === 0 ? cursorIndex : i === 1 ? cursorIndex2 : cursorIndex3;
                  return (
                    <div key={i} className="flex flex-col min-w-0">
                      <span className="text-[10px] text-white/50 block mb-0.5">x{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFocusedField(i as 0 | 1 | 2 | 3)}
                        className={`w-full min-h-[52px] text-left rounded-lg p-2 bg-[#1a1a24]/30 border shadow-[0 0 15px_rgba(58,141,255,0.2)] flex flex-col justify-end transition-all ring-offset-2 ring-offset-[#0B0F1A] border-white/10 ring-2 ${focusedField === i ? 'ring-[#5B8CFF]/40 border-[#5B8CFF]/40' : 'ring-transparent'}`}
                      >
                        <div className="min-h-[36px] text-lg text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-1" style={{ lineHeight: 1.4 }}>
                          {!val && <span className="text-white/30">0</span>}
                          {val ? (
                            <ExpressionWithCursorDisplay
                              expression={val}
                              cursorPosition={cur}
                              showCursor={focusedField === i}
                            />
                          ) : (
                            <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              ) : showTwoFields ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-xs text-white/50 block mb-1.5">{multiFieldLabel1}</span>
                    <button
                      type="button"
                      onClick={() => setFocusedField(0)}
                      className={`w-full min-h-[72px] text-left rounded-xl p-3 bg-[#1a1a24]/30 border shadow-[0 0 15px_rgba(58,141,255,0.2)] flex flex-col justify-end transition-all ring-offset-2 ring-offset-[#0B0F1A] border-white/10 ring-2 ${focusedField === 0 ? 'ring-[#5B8CFF]/40 border-[#5B8CFF]/40' : 'ring-transparent'}`}
                    >
                      <div className="min-h-[56px] text-2xl text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-2" style={{ lineHeight: 1.4 }}>
                        {!userAnswer && <span className="text-white/30">0</span>}
                        {userAnswer ? (
                          <ExpressionWithCursorDisplay
                            expression={userAnswer}
                            cursorPosition={cursorIndex}
                            showCursor={focusedField === 0}
                          />
                        ) : (
                          <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                        )}
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-white/50 block mb-1.5">{multiFieldLabel2}</span>
                    <button
                      type="button"
                      onClick={() => setFocusedField(1)}
                      className={`w-full min-h-[72px] text-left rounded-xl p-3 bg-[#1a1a24]/30 border shadow-[0 0 15px_rgba(58,141,255,0.2)] flex flex-col justify-end transition-all ring-offset-2 ring-offset-[#0B0F1A] border-white/10 ring-2 ${focusedField === 1 ? 'ring-[#5B8CFF]/40 border-[#5B8CFF]/40' : 'ring-transparent'}`}
                    >
                      <div className="min-h-[56px] text-2xl text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-2" style={{ lineHeight: 1.4 }}>
                        {!userAnswer2 && <span className="text-white/30">0</span>}
                        {userAnswer2 ? (
                          <ExpressionWithCursorDisplay
                            expression={userAnswer2}
                            cursorPosition={cursorIndex2}
                            showCursor={focusedField === 1}
                          />
                        ) : (
                          <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                        )}
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="w-full min-h-[72px] text-left rounded-xl p-3 bg-[#1a1a24]/30 border border-white/10 shadow-[0 0 15px_rgba(58,141,255,0.2)] flex flex-col justify-end transition-all ring-2 ring-[#5B8CFF]/40 ring-offset-2 ring-offset-[#0B0F1A]"
                >
                  <div className="min-h-[56px] text-2xl text-right overflow-x-auto overflow-y-auto rounded flex items-center justify-end w-full pr-2" style={{ lineHeight: 1.4 }}>
                    {!userAnswer && <span className="text-white/30">0</span>}
                    {userAnswer ? (
                      <ExpressionWithCursorDisplay
                        expression={userAnswer}
                        cursorPosition={cursorIndex}
                        showCursor={true}
                      />
                    ) : (
                      <span className="w-0.5 h-[1em] bg-[#5B8CFF] animate-pulse inline-block align-middle ml-0.5" style={{ verticalAlign: 'middle' }} />
                    )}
                  </div>
                </button>
              )}
            </div>
            {isInequality && (
              <button
                type="button"
                onClick={() => handleSubmit('∅')}
                className="w-full max-w-lg mx-auto mb-2 py-2.5 rounded-xl text-sm font-semibold text-[#9AA3B2] bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                {t('practice.no_solution')}
              </button>
            )}
            <div className="max-w-lg mx-auto w-full mb-2">
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
            <div className="flex gap-3">
              <button type="button" onClick={() => onAnswer(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#9AA3B2] bg-white/5 border border-white/10 active:scale-95">
                {t('practice.skip')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSolutionSteps(true);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#9AA3B2] bg-white/5 border border-white/10 active:scale-95"
              >
                💡 {t('practice.hint')}
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
};

export default PracticeScreen;
