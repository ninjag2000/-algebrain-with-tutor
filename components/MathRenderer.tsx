import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
  /** When true, wrap block math in a scrollable container for long formulas */
  scrollable?: boolean;
}

/** Placeholder injected for cursor position in input; replaced by vertical bar in LaTeX. */
export const CURSOR_PLACEHOLDER = '\u2060|\u2060';

/** Find position of matching ')' for '(' at openIndex. */
function findMatchingClose(s: string, openIndex: number): number {
    let balance = 1;
    for (let i = openIndex + 1; i < s.length; i++) {
        if (s[i] === '(') balance++;
        else if (s[i] === ')') { balance--; if (balance === 0) return i; }
    }
    return -1;
}
/** Find position of matching '(' for ')' at closeIndex. */
function findMatchingOpen(s: string, closeIndex: number): number {
    let balance = 1;
    for (let i = closeIndex - 1; i >= 0; i--) {
        if (s[i] === ')') balance++;
        else if (s[i] === '(') { balance--; if (balance === 0) return i; }
    }
    return -1;
}

/** Convert slash divisions a/b into \frac{a}{b} so fractions render with horizontal bar. */
function slashToFrac(s: string): string {
    let result = s;
    const slashIdx = result.indexOf('/');
    if (slashIdx === -1) return result;
    let pos: number;
    let numStart = 0;
    let num = '';
    let den = '';
    let denEnd = result.length;
    // numerator (backward from slash)
    pos = slashIdx - 1;
    while (pos >= 0 && /[\s\u00A0]/.test(result[pos]!)) pos--;
    if (pos < 0) return result;
    const c = result[pos]!;
    if (c === ')') {
        let open = -1;
        for (let i = 0; i <= pos; i++) {
            if (result[i] === '(' && findMatchingClose(result, i) === pos) {
                open = i;
                break;
            }
        }
        if (open === -1) return result;
        numStart = open;
        num = result.substring(open, pos + 1);
    } else if (/[\d.]/.test(c)) {
        while (pos >= 0 && /[\d.]/.test(result[pos]!)) pos--;
        numStart = pos + 1;
        num = result.substring(numStart, slashIdx).trim();
    } else if (/\w/.test(c)) {
        while (pos >= 0 && /\w/.test(result[pos]!)) pos--;
        numStart = pos + 1;
        num = result.substring(numStart, slashIdx).trim();
    } else {
        return result;
    }
    // denominator (forward from slash)
    pos = slashIdx + 1;
    while (pos < result.length && /[\s\u00A0]/.test(result[pos]!)) pos++;
    if (pos >= result.length) return result;
    const d = result[pos]!;
    if (d === '(') {
        const close = findMatchingClose(result, pos);
        if (close === -1) return result;
        denEnd = close + 1;
        den = result.substring(pos, denEnd);
    } else if (/[\d.]/.test(d)) {
        const start = pos;
        while (pos < result.length && /[\d.]/.test(result[pos]!)) pos++;
        denEnd = pos;
        den = result.substring(start, denEnd);
    } else if (/\w/.test(d)) {
        const start = pos;
        while (pos < result.length && /\w/.test(result[pos]!)) pos++;
        denEnd = pos;
        den = result.substring(start, denEnd);
    } else {
        return result;
    }
    const numLatex = convertToLaTeX(num);
    const denLatex = convertToLaTeX(den);
    return result.substring(0, numStart) + `\\frac{${numLatex}}{${denLatex}}` + result.substring(denEnd);
}

/** Normalize common LaTeX typos so KaTeX can render instead of showing raw source. */
function normalizeLaTeXTypos(s: string): string {
    let r = s;
    // Двойной обратный слэш → один (AI иногда возвращает \\frac)
    r = r.replace(/\\\\/g, '\\');
    // \sqrt{10\right) -> \sqrt{10}\right) (only simple \sqrt{number} to avoid breaking nested \sqrt{\log...})
    r = r.replace(/\\sqrt\{(\d+)\\right(\)?)/g, '\\sqrt{$1}\\right$2');
    // \left(4\right} -> \left(4\right) (wrong closing brace after \right)
    r = r.replace(/\\left\(([^)]*)\\right\}/g, '\\left($1\\right)');
    // log_{...} without backslash -> \log_{...}
    r = r.replace(/(^|[^\\])log_/g, '$1\\log_');
    return r;
}

/** Заменить frac(num)(den) со сбалансированными скобками на \frac{num}{den}. */
function fracParenToLaTeX(s: string): string {
    let result = s;
    let idx: number;
    while ((idx = result.indexOf('frac(')) !== -1) {
        const openNum = idx + 5;
        let balance = 1;
        let closeNum = -1;
        for (let i = openNum; i < result.length; i++) {
            if (result[i] === '(') balance++;
            else if (result[i] === ')') {
                balance--;
                if (balance === 0) {
                    closeNum = i;
                    break;
                }
            }
        }
        if (closeNum === -1) break;
        if (result[closeNum + 1] !== '(') break;
        const openDen = closeNum + 2;
        balance = 1;
        let closeDen = -1;
        for (let i = openDen; i < result.length; i++) {
            if (result[i] === '(') balance++;
            else if (result[i] === ')') {
                balance--;
                if (balance === 0) {
                    closeDen = i;
                    break;
                }
            }
        }
        if (closeDen === -1) break;
        const num = result.substring(openNum, closeNum);
        const den = result.substring(openDen, closeDen);
        const latex = `\\frac{${convertToLaTeX(num)}}{${convertToLaTeX(den)}}`;
        result = result.substring(0, idx) + latex + result.substring(closeDen + 1);
    }
    return result;
}

/** Convert app notation (^( ), frac{}, sqrt(), etc.) to LaTeX. Pass-through if already LaTeX (starts with \). */
export const convertToLaTeX = (expr: string): string => {
    let str = typeof expr === 'string' ? expr : String(expr ?? '');
    str = str.replace(/α/g, 'a').trim();
    str = str.replace(/\s*(Решить|Solve|Resolver)\.?\s*$/gi, '').trim();
    let result = str;
    result = normalizeLaTeXTypos(result);
    // Ранний выход только если выражение уже в LaTeX (начинается с \). Иначе всегда применяем slashToFrac и остальные преобразования.
    if (result.startsWith('\\')) {
        return result;
    }
    result = str;
    result = normalizeLaTeXTypos(result);
    // Дроби со слэшем → \frac{}{} (горизонтальная черта)
    while (result.includes('/')) {
        const next = slashToFrac(result);
        if (next === result) break;
        result = next;
    }
    // frac(numerator)(denominator) со скобками → \frac{}{}
    result = fracParenToLaTeX(result);
    // Символ бесконечности для интервалов (-∞,+∞)
    result = result.replace(/∞/g, '\\infty');
    // Не показывать "+ -5", сразу "-5": плюс перед минусом заменяем на один минус
    result = result.replace(/\s\+\s+-/g, ' - ');
    result = result.replace(/\s-\s+-/g, ' + ');
    // Cursor placeholder (used in assessment input) -> vertical bar
    result = result.replace(/\u2060\|\u2060/g, '\\vert');
    // Handle exponents ^(content) -> ^{content}
    while (result.includes('^(')) {
        const start = result.indexOf('^(');
        let balance = 1;
        let end = -1;
        for (let i = start + 2; i < result.length; i++) {
            if (result[i] === '(') balance++;
            if (result[i] === ')') {
                balance--;
                if (balance === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end !== -1) {
            const content = result.substring(start + 2, end);
            const expContent = content.trim() ? convertToLaTeX(content) : '\\phantom{0}';
            result = result.substring(0, start) + '^{' + expContent + '}' + result.substring(end + 1);
        } else break;
    }
    // Степень без скобок: x^0.25, x^1/7 -> x^{0.25}, x^{1/7}
    result = result.replace(/\^(\d+(?:[.,]\d*)?)/g, (_, exp) => '^{' + exp.replace(',', '.') + '}');
    result = result.replace(/\^(\d+\s*\/\s*\d+)/g, (_, exp) => '^{' + exp.replace(/\s/g, '') + '}');
    // log[base](arg) со сбалансированными скобками в arg; степень после ) → верхний индекс у \right
    let logIdx: number;
    while ((logIdx = result.indexOf('log[')) !== -1) {
        const bracketEnd = result.indexOf(']', logIdx + 4);
        if (bracketEnd === -1 || result[bracketEnd + 1] !== '(') break;
        const base = result.substring(logIdx + 4, bracketEnd);
        const openArg = bracketEnd + 2;
        const closeArg = findMatchingClose(result, openArg - 1);
        if (closeArg === -1) break;
        const arg = result.substring(openArg, closeArg);
        let expPart = '';
        let tailStart = closeArg + 1;
        const rest = result.substring(tailStart);
        const powParenMatch = /^\s*\^\(/.exec(rest);
        if (powParenMatch) {
            const expOpen = tailStart + powParenMatch[0].length - 1;
            const expClose = findMatchingClose(result, expOpen);
            if (expClose !== -1) {
                const expContent = result.substring(expOpen + 1, expClose).trim();
                expPart = '^{' + (expContent ? convertToLaTeX(expContent) : '') + '}';
                tailStart = expClose + 1;
            }
        } else {
            const powNum = /^\s*\^(\d+)/.exec(rest);
            const unicodeSup = /^\s*([²³¹⁰⁴⁵⁶⁷⁸⁹])/.exec(rest);
            const unicodeToExp: Record<string, string> = { '²': '2', '³': '3', '¹': '1', '⁰': '0', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
            if (powNum) {
                expPart = '^{' + powNum[1] + '}';
                tailStart += powNum[0].length;
            } else if (unicodeSup) {
                expPart = '^{' + (unicodeToExp[unicodeSup[1]] ?? unicodeSup[1]) + '}';
                tailStart += unicodeSup[0].length;
            }
        }
        const b = convertToLaTeX(base).trim();
        const a = convertToLaTeX(arg);
        const logLatex = b
            ? `\\log_{${b}}\\left(${a}\\right)${expPart}`
            : `\\log\\left(${a}\\right)${expPart}`;
        result = result.substring(0, logIdx) + logLatex + result.substring(tailStart);
    }
    result = result.replace(/sqrt\((.*?)\)/g, (_, rad) => `\\sqrt{${convertToLaTeX(rad)}}`);
    // cbrt(x) → ∛ (кубический корень)
    result = result.replace(/cbrt\((.*?)\)/g, (_, rad) => `\\sqrt[3]{${convertToLaTeX(rad)}}`);
    // root(n)(x) → ⁿ√x
    result = result.replace(/root\(([^)]+)\)\((.*?)\)/g, (_, deg, rad) => `\\sqrt[${convertToLaTeX(deg)}]{${convertToLaTeX(rad)}}`);
    // Normalize √[deg]/() to √[deg]() so nth-root can be parsed
    result = result.replace(/√\[([^\]]*)\]\s*\/\s*\(\)/g, '√[$1]()');
    // √[degree](radicand): для степени 2 — только \sqrt{radicand} (без [] и индекса), как на calculator screen
    result = result.replace(/√\[(.*?)\]\((?!\))(.+?)\)/g, (_, deg, rad) => {
        const degTrim = deg.trim();
        const radLatex = convertToLaTeX(rad);
        if (degTrim === '2') return `\\sqrt{${radLatex}}`;
        const d = degTrim ? convertToLaTeX(deg) : '\\phantom{0}';
        return `\\sqrt[${d}]{${radLatex}}`;
    });
    result = result.replace(/√\[([^\]]*)\]\(\)(.*)/s, (_, deg, rad) => {
        const degTrim = deg.trim();
        const r = rad.trim() ? convertToLaTeX(rad) : '\\phantom{0}';
        if (degTrim === '2') return `\\sqrt{${r}}`;
        const d = degTrim ? convertToLaTeX(deg) : '\\phantom{0}';
        return `\\sqrt[${d}]{${r}}`;
    });
    result = result.replace(/√\((.*?)\)/g, (_, rad) => `\\sqrt{${convertToLaTeX(rad)}}`);
    result = result.replace(/frac\{(.*?)\}\{(.*?)\}/g, (_, num, den) => {
        const n = num.trim() ? convertToLaTeX(num) : '\\phantom{0}';
        const d = den.trim() ? convertToLaTeX(den) : '\\phantom{0}';
        return `\\frac{${n}}{${d}}`;
    });
    // frac без скобок: frac12 → frac{1}{2} (первая группа — минимальная, вторая — остаток)
    result = result.replace(/frac(\d+?)(\d+)/g, (_, num, den) => `\\frac{${num}}{${den}}`);
    // frac + число + переменная + число: frac9x2 → 9x/2
    result = result.replace(/frac(\d+)([a-zA-Z]\w*)(\d+)/g, (_, num, varPart, den) => `\\frac{${num}${convertToLaTeX(varPart)}}{${den}}`);
    // frac + число + переменная: frac3x → 3/x, frac1x → 1/x
    result = result.replace(/frac(\d+)([a-zA-Z]\w*)/g, (_, num, varPart) => `\\frac{${num}}{${convertToLaTeX(varPart)}}`);
    result = result.replace(/mixfrac\{(.*?)\}\{(.*?)\}\{(.*?)\}/g, (_, w, n, d) => `${convertToLaTeX(w)}\\frac{${convertToLaTeX(n)}}{${convertToLaTeX(d)}}`);
    // system{...} — содержимое может содержать {}, например x^{2}+y^{2}=25; ищем закрывающую } по балансу скобок
    let systemStart: number;
    while ((systemStart = result.indexOf('system{')) !== -1) {
        let depth = 1;
        let end = systemStart + 7;
        for (; end < result.length; end++) {
            if (result[end] === '{') depth++;
            else if (result[end] === '}') {
                depth--;
                if (depth === 0) break;
            }
        }
        if (depth !== 0) break;
        const content = result.substring(systemStart + 7, end);
        const eqs = content.split(';').map((e: string) => convertToLaTeX(e.trim())).filter(Boolean).join(' \\\\ ');
        result = result.substring(0, systemStart) + `\\begin{cases} ${eqs} \\end{cases}` + result.substring(end + 1);
    }
    // В LaTeX/KaTeX % — комментарий; экранируем, чтобы отображался знак %
    result = result.replace(/(?<!\\)%/g, '\\%');
    return result;
};

const MathRenderer: React.FC<MathRendererProps> = ({ expression, displayMode = false, className = "", scrollable = false }) => {
    const html = useMemo(() => {
        try {
            const exprStr = typeof expression === 'string' ? expression : String(expression ?? '');
            const latex = convertToLaTeX(exprStr);
            return katex.renderToString(latex, {
                throwOnError: false,
                displayMode,
                strict: false,
                trust: false,
                errorColor: '#9AA3B2',
            });
        } catch (e) {
            return typeof expression === 'string' ? expression : String(expression ?? '');
        }
    }, [expression, displayMode]);

    const inner = (
        <span
            className={`${displayMode ? 'block' : 'inline-block'} ${className}`}
            style={displayMode ? { overflow: scrollable ? 'auto' : 'visible' } : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );

    if (displayMode && scrollable) {
        return (
            <div className="overflow-x-auto overflow-y-hidden scrollbar-hide py-2 min-h-[2.5rem] flex items-center" style={{ WebkitOverflowScrolling: 'touch' }}>
                {inner}
            </div>
        );
    }
    return inner;
};

export default MathRenderer;