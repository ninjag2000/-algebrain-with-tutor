/**
 * Диапазоны позиций, которые курсор "перескакивает" за один шаг (дробь, степень, логарифм).
 */
function getAllSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  ranges.push(...getFracSkipRanges(expr));
  ranges.push(...getExponentSkipRanges(expr));
  ranges.push(...getLogSkipRanges(expr));
  ranges.push(...getRootSkipRanges(expr));
  ranges.push(...getEmptyParensSkipRanges(expr));
  return ranges;
}

const isOpenParen = (c: string) => c === '(' || c === '\uFF08';
const isCloseParen = (c: string) => c === ')' || c === '\uFF09';

/** Пропускаем позицию между соседними пустыми скобками (), кроме подкоренного выражения корня. */
function getEmptyParensSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const isSqrt = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
  const ranges: Array<{ from: number; to: number }> = [];
  for (let i = 0; i < expr.length - 1; i++) {
    if (isOpenParen(expr[i]) && isCloseParen(expr[i + 1])) {
      const afterRoot = i >= 1 && (isSqrt(expr[i - 1]) || expr[i - 1] === ']' || expr[i - 1] === '\uFF3D');
      if (!afterRoot) ranges.push({ from: i + 1, to: i + 1 });
    }
  }
  return ranges;
}

/**
 * Корень √[degree](radicand): курсор не должен попадать между √ и [; между ] и ( пропускаем.
 * Позицию «после цифры в степени» (перед ]) не пропускаем — чтобы курсор мог встать после 5 в ⁵√.
 */
function getRootSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  const isSqrt = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
  const isOpenBracket = (c: string) => c === '[' || c === '\uFF3B';
  const closeBracketIdx = (from: number) => {
    const j = expr.indexOf(']', from);
    const jw = expr.indexOf('\uFF3D', from);
    if (j === -1) return jw;
    if (jw === -1) return j;
    return Math.min(j, jw);
  };
  let i = 0;
  while (i < expr.length) {
    const sqrtIdx = expr.indexOf('√', i);
    if (sqrtIdx === -1) break;
    if (!isSqrt(expr[sqrtIdx])) { i = sqrtIdx + 1; continue; }
    const openBracket = sqrtIdx + 1;
    if (openBracket >= expr.length || !isOpenBracket(expr[openBracket])) {
      i = sqrtIdx + 1;
      continue;
    }
    const bracketEnd = closeBracketIdx(openBracket + 1);
    if (bracketEnd === -1) { i = openBracket + 1; continue; }
    const degreeNotEmpty = bracketEnd > openBracket + 1;
    if (degreeNotEmpty) ranges.push({ from: openBracket, to: openBracket });
    let p = bracketEnd + 1;
    while (p < expr.length && expr[p] === ' ') p++;
    if (p < expr.length && isOpenParen(expr[p])) {
      const openParen = p;
      ranges.push({ from: bracketEnd + 1, to: openParen });
      let depth = 1;
      let q = openParen + 1;
      while (q < expr.length && depth > 0) {
        if (isOpenParen(expr[q])) depth++;
        else if (isCloseParen(expr[q])) depth--;
        q++;
      }
      i = q;
    } else {
      i = bracketEnd + 1;
    }
  }
  i = 0;
  while (i < expr.length) {
    const sqrtIdx = expr.indexOf('√', i);
    if (sqrtIdx === -1) break;
    if (!isSqrt(expr[sqrtIdx])) { i = sqrtIdx + 1; continue; }
    const next = sqrtIdx + 1;
    if (next < expr.length && isOpenParen(expr[next])) {
      const openParen = next;
      let depth = 1;
      let q = openParen + 1;
      while (q < expr.length && depth > 0) {
        if (isOpenParen(expr[q])) depth++;
        else if (isCloseParen(expr[q])) depth--;
        q++;
      }
      i = q;
    } else {
      i = sqrtIdx + 1;
    }
  }
  return ranges;
}

/**
 * Логарифм log[base](arg): пропускаем позиции от ] до ( включительно,
 * чтобы за одно движение вправо перейти из [] в (), влево — из () в [].
 */
function getLogSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  let i = 0;
  const isOpenParen = (c: string) => c === '(' || c === '\uFF08';
  while (i < expr.length) {
    const logIdx = expr.indexOf('log[', i);
    if (logIdx === -1) break;
    const bracketEnd = expr.indexOf(']', logIdx + 4);
    if (bracketEnd === -1) { i = logIdx + 1; continue; }
    let p = bracketEnd + 1;
    while (p < expr.length && expr[p] === ' ') p++;
    if (p < expr.length && isOpenParen(expr[p])) {
      ranges.push({ from: bracketEnd + 1, to: p });
      i = p + 1;
    } else {
      i = bracketEnd + 1;
    }
  }
  return ranges;
}

/**
 * Степень: пропускаем только позиции между ^ и ( (не включая позицию «сразу после основания»).
 * from: caretIdx+1 чтобы позиция «справа от основания» (на ^) оставалась доступной.
 */
function getExponentSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  let i = 0;
  const isCaret = (c: string) => c === '^' || (c && c.charCodeAt(0) === 0x5E);
  const isOpenParen = (c: string) => c === '(' || c === '\uFF08';
  while (i < expr.length) {
    const caretIdx = expr.indexOf('^', i);
    if (caretIdx === -1) break;
    if (!isCaret(expr[caretIdx])) { i = caretIdx + 1; continue; }
    let p = caretIdx + 1;
    while (p < expr.length && expr[p] === ' ') p++;
    if (p < expr.length && isOpenParen(expr[p])) {
      ranges.push({ from: caretIdx + 1, to: p });
      i = p + 1;
    } else {
      i = caretIdx + 1;
    }
  }
  return ranges;
}

/**
 * Внутри frac{}{} пропускаем позицию между числителем и знаменателем (закрывающая "}" числителя),
 * чтобы шаг вправо: числитель → знаменатель → выход из дроби.
 */
function getFracSkipRanges(expr: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  let i = 0;
  while (i < expr.length) {
    const fracIdx = expr.indexOf('frac{', i);
    if (fracIdx === -1) break;
    const numStart = fracIdx + 5;
    let depth = 1;
    let j = numStart;
    while (j < expr.length && depth > 0) {
      if (expr[j] === '{') depth++;
      else if (expr[j] === '}') depth--;
      j++;
    }
    const numEnd = j - 1;
    if (j < expr.length && expr[j] === '{') {
      const denStart = j + 1;
      let depth2 = 1;
      let k = denStart;
      while (k < expr.length && depth2 > 0) {
        if (expr[k] === '{') depth2++;
        else if (expr[k] === '}') depth2--;
        k++;
      }
      const afterEnd = k;
      ranges.push({ from: numEnd + 1, to: denStart - 1 });
      i = afterEnd;
    } else {
      i = j;
    }
  }
  return ranges;
}

function isInRange(pos: number, ranges: Array<{ from: number; to: number }>): boolean {
  return ranges.some(r => pos >= r.from && pos <= r.to);
}

/** Следующая логическая позиция курсора при движении вправо (учёт frac и степени). */
export function getLogicalCursorRight(expression: string, currentPos: number): number {
  const len = expression.length;
  if (currentPos >= len) return len;
  const skipRanges = getAllSkipRanges(expression);
  let next = currentPos + 1;
  while (next <= len && isInRange(next, skipRanges)) next++;
  return Math.min(next, len);
}

/** Предыдущая логическая позиция курсора при движении влево (учёт frac и степени). */
export function getLogicalCursorLeft(expression: string, currentPos: number): number {
  if (currentPos <= 0) return 0;
  const skipRanges = getAllSkipRanges(expression);
  let prev = currentPos - 1;
  while (prev >= 0 && isInRange(prev, skipRanges)) prev--;
  return Math.max(prev, 0);
}

/** Позиция курсора сразу после вставки дроби "frac{}{}": в числителе (после "frac{"). */
export const FRAC_INSERT_CURSOR_OFFSET = 5;

/**
 * Если курсор стоит сразу после конца дроби (frac{}{} или mixfrac{}{}{}),
 * возвращает диапазон удаления целиком этого блока. Иначе null (удалять один символ).
 */
export function getBackspaceDeletionRange(expression: string, cursorIndex: number): { start: number; end: number } | null {
  if (cursorIndex <= 0) return null;
  const pos = cursorIndex - 1;
  if (expression[pos] !== '}') return null;

  let depth = 1;
  let i = pos - 1;
  let openBrace = -1;
  while (i >= 0 && depth > 0) {
    if (expression[i] === '}') depth++;
    else if (expression[i] === '{') {
      if (depth === 1) openBrace = i;
      depth--;
    }
    i--;
  }
  if (openBrace < 0 || depth !== 0) return null;

  const mixfracStart = expression.lastIndexOf('mixfrac{', openBrace);
  if (mixfracStart !== -1) {
    const slice = expression.substring(mixfracStart, cursorIndex);
    if (slice.startsWith('mixfrac{') && slice.endsWith('}')) return { start: mixfracStart, end: cursorIndex };
  }
  const fracStart = expression.lastIndexOf('frac{', openBrace);
  if (fracStart !== -1) {
    const slice = expression.substring(fracStart, cursorIndex);
    if (slice.startsWith('frac{') && slice.endsWith('}')) return { start: fracStart, end: cursorIndex };
  }
  return null;
}
