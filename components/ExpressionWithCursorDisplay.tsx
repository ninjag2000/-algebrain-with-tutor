import React from 'react';
import MathRenderer from './MathRenderer';

export interface ExpressionWithCursorDisplayProps {
  expression: string;
  cursorPosition: number;
  showCursor?: boolean;
  /** Курсор в ячейке дроби: не схлопывается и остаётся видимым */
  embedInFraction?: boolean;
}

const ExpressionWithCursorDisplay: React.FC<ExpressionWithCursorDisplayProps> = ({
  expression,
  cursorPosition,
  showCursor = true,
  embedInFraction = false,
}) => {
  const effectiveCursorPosition = showCursor === false ? -1 : cursorPosition;

  const specialPartRegex = /(√√[\[［].*?[\]］]\(.*?\)|√[\[［].*?[\]］]\(.*?\)|√\(.*?\)|frac\{.*?\}\{.*?\}|system\{.*?\}|mixfrac\{.*?\}\{.*?\}\{.*?\})/g;
  let parts = expression.split(specialPartRegex);
  parts = parts.filter(Boolean);
  const resultElements: React.ReactNode[] = [];
  let processedLength = 0;
  const cursorClasses = "inline-block w-0.5 bg-blue-400 animate-pulse shadow-[0_0_8px_theme(colors.blue.400)]";
  const cursorElement = <span className={`${cursorClasses} h-[1em] align-middle`} style={{ verticalAlign: 'middle' }}></span>;
  /** Курсор в подкоренном выражении: смещён вверх, визуально по середине знака √ */
  const cursorInRadicandElement = <span className={`${cursorClasses} cursor-in-radicand h-[1em] align-middle`} style={{ verticalAlign: 'middle' }}></span>;
  const cursorElementPlain = <span className={`${cursorClasses} h-[1em] align-middle`} style={{ verticalAlign: 'middle' }}></span>;
  const cursorWithIndentAfterRoot = <span style={{ display: 'inline-flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 12, minWidth: 8, verticalAlign: 'middle' }} aria-hidden>{'\u00A0'}</span>{cursorElement}</span>;
  const indexCursorElement = <span className={`${cursorClasses} h-[0.6em] align-middle`} style={{ verticalAlign: 'middle' }}></span>;
  const supCursorElement = indexCursorElement;
  const fracCursorElement = indexCursorElement;
  const subCursorElement = indexCursorElement;

  /** Парсит один блок log[base](arg) начиная с позиции start. Возвращает { base, arg, end } или null. */
  const parseOneLog = (s: string, start: number): { base: string; arg: string; end: number } | null => {
    if (start + 4 > s.length || s.substring(start, start + 4) !== 'log[') return null;
    const baseEnd = s.indexOf(']', start + 4);
    if (baseEnd === -1) return null;
    const base = s.substring(start + 4, baseEnd);
    let p = baseEnd + 1;
    while (p < s.length && s[p] === ' ') p++;
    if (p >= s.length || (s[p] !== '(' && s[p] !== '\uFF08')) return null;
    const openP = p;
    let depth = 1;
    p++;
    while (p < s.length && depth > 0) {
      if (s[p] === '(' || s[p] === '\uFF08') depth++;
      else if (s[p] === ')' || s[p] === '\uFF09') depth--;
      p++;
    }
    if (depth !== 0) return null;
    const arg = s.substring(openP + 1, p - 1);
    return { base, arg, end: p };
  };

  const rootDegreeForDisplayLegacy = (d: string) => {
    if (!d || d === '-') return '';
    const inParens = d.match(/\^?\s*\(\s*(\d+)\s*\)/);
    const fromParens = inParens ? inParens[1] : null;
    const noSup = d.replace(/\u00B2/g, '2').replace(/\u00B3/g, '3').replace(/\u00B9/g, '1');
    const num = noSup.match(/\d+/);
    const result = fromParens ?? (num ? num[0] : (d.trim() || ''));
    return result === '2' ? '' : result;
  };

  const unwrapRadicandLegacy = (r: string): { display: string; startOff: number } => {
    const t = r.trim();
    const isSqrt = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
    if (t.length > 2 && isSqrt(t[0]) && (t[1] === '(' || t[1] === '\uFF08')) {
      let depth = 1, i = 2;
      while (i < t.length && depth > 0) {
        if (t[i] === '(' || t[i] === '\uFF08') depth++;
        else if (t[i] === ')' || t[i] === '\uFF09') { depth--; if (depth === 0) return { display: t.substring(2, i).trim(), startOff: r.indexOf(t) + 2 }; }
        i++;
      }
    }
    if (t.length > 2 && (t[0] === '(' || t[0] === '\uFF08') && (t[t.length - 1] === ')' || t[t.length - 1] === '\uFF09')) {
      let depth = 1, i = 1;
      while (i < t.length && depth > 0) {
        if (t[i] === '(' || t[i] === '\uFF08') depth++;
        else if (t[i] === ')' || t[i] === '\uFF09') { depth--; if (depth === 0 && i === t.length - 1) return { display: t.substring(1, i).trim(), startOff: r.indexOf(t) + 1 }; }
        i++;
      }
    }
    return { display: r, startOff: 0 };
  };

  const parseNthRootPart = (s: string): { degRaw: string; deg: string; rad: string; dStart: number; dEnd: number; rStart: number; rEnd: number } | null => {
    const strip = (x: string) => x.replace(/^[\s\[\uFF3B]+/, '').replace(/[\s\]\uFF3D]+$/, '').trim();
    if ((s.startsWith('√[') || s.startsWith('√［')) && (s.endsWith(')') || s.endsWith('\uFF09'))) {
      const degRaw = s.match(/√[\[［](.*?)[\]］]/)?.[1] ?? '';
      const idxCloseB = s.indexOf(']');
      const idxParen = idxCloseB >= 0 ? s.indexOf('(', idxCloseB) : s.indexOf('(');
      let p = idxCloseB >= 0 ? idxCloseB + 1 : 0;
      const isSqrt = (c: string) => c === '√' || (c != null && c.charCodeAt(0) === 0x221A);
      while (p < s.length && (s[p] === ' ' || isSqrt(s[p]))) p++;
      const openP = (p < s.length && (s[p] === '(' || s[p] === '\uFF08')) ? p : idxParen;
      let rad = '';
      if (openP >= 0) {
        let depth = 1, end = openP + 1;
        while (end < s.length && depth > 0) {
          if (s[end] === '(' || s[end] === '\uFF08') depth++;
          else if (s[end] === ')' || s[end] === '\uFF09') depth--;
          end++;
        }
        if (depth === 0) rad = s.substring(openP + 1, end - 1);
      }
      const dStart = 2, dEnd = 2 + degRaw.length, rStart = openP + 1, rEnd = rStart + rad.length;
      return { degRaw, deg: strip(degRaw), rad, dStart, dEnd, rStart, rEnd };
    }
    if (s.startsWith('√√[') || s.startsWith('√√［') || (s.startsWith('√√') && (s.includes('[') || s.includes('［')) && s.includes(')'))) {
      const idxB = Math.min(s.indexOf('[') >= 0 ? s.indexOf('[') : 1e9, s.indexOf('［') >= 0 ? s.indexOf('［') : 1e9);
      const idxE = idxB < s.length ? (s.indexOf(']', idxB) >= 0 ? s.indexOf(']', idxB) : s.indexOf('］', idxB)) : -1;
      if (idxB >= 1e9 || idxE < 0) return null;
      const degRaw = s.substring(idxB + 1, idxE);
      let p = idxE + 1;
      while (p < s.length && (s[p] === '√' || s[p] === ' ' || (s.charCodeAt(p) === 0x221A))) p++;
      if (p >= s.length || (s[p] !== '(' && s[p] !== '\uFF08')) return null;
      let depth = 1, q = p + 1;
      while (q < s.length && depth > 0) {
        if (s[q] === '(' || s[q] === '\uFF08') depth++;
        else if (s[q] === ')' || s[q] === '\uFF09') depth--;
        q++;
      }
      if (depth !== 0) return null;
      const rad = s.substring(p + 1, q - 1);
      const dStart = idxB + 1, dEnd = idxE, rStart = p + 1, rEnd = rStart + rad.length;
      return { degRaw, deg: strip(degRaw), rad, dStart, dEnd, rStart, rEnd };
    }
    return null;
  };

  if (expression.length === 0) {
    const cur = effectiveCursorPosition >= 0 ? cursorElement : <></>;
    return embedInFraction ? <span className="fraction-part-display">{cur}</span> : cur;
  }

  let cursorRenderedAtEnd = false;
  parts.forEach((part, index) => {
    if (!part) return;
    if ((part === '[' || part === '\uFF3B') && index + 1 < parts.length && (parts[index + 1].startsWith('√[') || parts[index + 1].startsWith('√［'))) {
      processedLength += part.length;
      return;
    }
    const partStart = processedLength;
    const partEnd = partStart + part.length;
    const hasCursor = (effectiveCursorPosition >= partStart && effectiveCursorPosition <= partEnd);
    const relativeCursorPos = effectiveCursorPosition - partStart;
    let node: React.ReactNode;

    const nthRoot = parseNthRootPart(part);
    if (nthRoot) {
      const { deg, rad, dStart, dEnd, rStart, rEnd } = nthRoot;
      const { display: radDisplay, startOff: radStartOff } = unwrapRadicandLegacy(rad);
      const radDispCur = Math.max(0, Math.min(radDisplay.length, (relativeCursorPos - rStart) - radStartOff));
      const degSanitized = deg.replace(/√|\u221A/g, '').trim();
      const degDisplay = (deg === '' || degSanitized === '' || degSanitized === '-') ? '' : rootDegreeForDisplayLegacy(degSanitized || deg);
      if (deg === '2' && !part.startsWith('√√')) {
        const radStart = part.indexOf('(') + 1;
        const radEnd = radStart + rad.length;
        if (hasCursor && relativeCursorPos >= radStart && relativeCursorPos <= radEnd) {
          node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{radDisplay.substring(0, radDispCur)}{cursorInRadicandElement}{radDisplay.substring(radDispCur)}</span></span>;
        } else if (hasCursor) {
          const r = <span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span>;
          node = relativeCursorPos < radStart ? (relativeCursorPos === 0 && index > 0 ? <span key={index}>{r}</span> : <React.Fragment key={index}>{cursorElement}{r}</React.Fragment>) : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
        } else node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span>;
      } else {
        const degreeIs2or3Part = (deg === '2' && !part.startsWith('√√')) || deg === '3';
        const radicandWithCurAtStart = <span className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{cursorInRadicandElement}{radDisplay}</span></span>;
        const degSup = degDisplay ? <sup className="root-degree-n">{degDisplay}</sup> : null;
        const degSupWithCur = degDisplay ? (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd ? <sup className="root-degree-n">{degDisplay.substring(0, relativeCursorPos - dStart)}{supCursorElement}{degDisplay.substring(relativeCursorPos - dStart)}</sup> : <sup className="root-degree-n">{degDisplay}</sup>) : (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd ? supCursorElement : null);
        if (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd) {
          node = <span key={index} className="inline-flex items-baseline">{degSupWithCur}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
        } else if (hasCursor && relativeCursorPos >= rStart && relativeCursorPos <= rEnd) {
          node = <span key={index} className="inline-flex items-baseline">{degSup}<span className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{radDisplay.substring(0, radDispCur)}{cursorInRadicandElement}{radDisplay.substring(radDispCur)}</span></span></span>;
        } else if (hasCursor) {
          const r = <span key={index} className="inline-flex items-baseline">{degSup}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
          if (relativeCursorPos > dEnd && relativeCursorPos < rStart) node = degreeIs2or3Part ? <span key={index} className="inline-flex items-baseline">{degSup}{radicandWithCurAtStart}</span> : <span key={index} className="inline-flex items-baseline">{degSup}{cursorElement}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
          else node = relativeCursorPos < dStart ? (relativeCursorPos === 0 && index > 0 ? <span key={index}>{r}</span> : <React.Fragment key={index}>{cursorElement}{r}</React.Fragment>) : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
        } else node = <span key={index} className="inline-flex items-baseline">{degSup}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
      }
    } else if ((part.startsWith('√[') || part.startsWith('√［')) && (part.endsWith(')') || part.endsWith('\uFF09'))) {
      const degRaw = part.match(/√[\[［](.*?)[\]］]/)?.[1] ?? '';
      const deg = degRaw.replace(/^[\s\[\uFF3B]+/, '').replace(/[\s\]\uFF3D]+$/, '').trim();
      let rad = part.match(/[(（](.*?)[)）]/)?.[1] ?? '';
      const { display: radDisplayFb, startOff: radStartOffFb } = unwrapRadicandLegacy(rad);
      const radDispCurFb = Math.max(0, Math.min(radDisplayFb.length, (relativeCursorPos - (part.indexOf('(') + 1)) - radStartOffFb));
      const degSanitized = deg.replace(/√|\u221A/g, '').trim();
      const degDisplay = (deg === '' || degSanitized === '' || degSanitized === '-') ? '' : rootDegreeForDisplayLegacy(degSanitized || deg);
      if (deg === '2' && !part.startsWith('√√')) {
        const radStart = part.indexOf('(') + 1;
        const radEnd = radStart + rad.length;
        if (hasCursor && relativeCursorPos >= radStart && relativeCursorPos <= radEnd) {
          node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{radDisplayFb.substring(0, radDispCurFb)}{cursorInRadicandElement}{radDisplayFb.substring(radDispCurFb)}</span></span>;
        } else if (hasCursor) {
          const r = <span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span>;
          node = relativeCursorPos < radStart ? (relativeCursorPos === 0 && index > 0 ? <span key={index}>{r}</span> : <React.Fragment key={index}>{cursorElement}{r}</React.Fragment>) : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
        } else node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span>;
      } else {
        const dStart = 2, dEnd = dStart + deg.length, rStart = part.indexOf('(') + 1, rEnd = rStart + rad.length;
        const degreeIs2or3Fb = (deg === '2' && !part.startsWith('√√')) || deg === '3';
        const radicandWithCurAtStartFb = <span className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{cursorInRadicandElement}{radDisplayFb}</span></span>;
        const degSupFb = degDisplay ? <sup className="root-degree-n">{degDisplay}</sup> : null;
        const degSupWithCurFb = degDisplay ? (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd ? <sup className="root-degree-n">{degDisplay.substring(0, relativeCursorPos - dStart)}{supCursorElement}{degDisplay.substring(relativeCursorPos - dStart)}</sup> : <sup className="root-degree-n">{degDisplay}</sup>) : (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd ? supCursorElement : null);
        if (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd) {
          node = <span key={index} className="inline-flex items-baseline">{degSupWithCurFb}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span></span>;
        } else if (hasCursor && relativeCursorPos >= rStart && relativeCursorPos <= rEnd) {
          node = <span key={index} className="inline-flex items-baseline">{degSupFb}<span className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{radDisplayFb.substring(0, radDispCurFb)}{cursorInRadicandElement}{radDisplayFb.substring(radDispCurFb)}</span></span></span>;
        } else if (hasCursor) {
          const r = <span key={index} className="inline-flex items-baseline">{degSupFb}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span></span>;
          if (relativeCursorPos > dEnd && relativeCursorPos < rStart) node = degreeIs2or3Fb ? <span key={index} className="inline-flex items-baseline">{degSupFb}{radicandWithCurAtStartFb}</span> : <span key={index} className="inline-flex items-baseline">{degSupFb}{cursorElement}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span></span>;
          else node = relativeCursorPos < dStart ? <React.Fragment key={index}>{cursorElement}{r}</React.Fragment> : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
        } else node = <span key={index} className="inline-flex items-baseline">{degSupFb}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplayFb}</span></span></span>;
      }
    } else if (part.startsWith('√√(') && part.endsWith(')')) {
      const rad = part.match(/\((.*?)\)/)?.[1] || '';
      const rStart = 3, rEnd = 3 + rad.length;
      if (hasCursor && relativeCursorPos >= rStart && relativeCursorPos <= rEnd) {
        node = <span key={index} className="inline-flex items-baseline"><span className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{rad.substring(0, relativeCursorPos - rStart)}{cursorInRadicandElement}{rad.substring(relativeCursorPos - rStart)}</span></span></span>;
      } else if (hasCursor) {
        const r = <span className="inline-flex items-baseline"><span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{rad}</span></span></span>;
        node = relativeCursorPos < rStart ? (relativeCursorPos === 0 && index > 0 ? <span key={index}>{r}</span> : <React.Fragment key={index}>{cursorElement}{r}</React.Fragment>) : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
      } else node = <span key={index} className="inline-flex items-baseline"><span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{rad}</span></span></span>;
    } else if (part.startsWith('√(') && part.endsWith(')')) {
      const rad = part.substring(2, part.length - 1);
      if (hasCursor && relativeCursorPos >= 2 && relativeCursorPos <= 2 + rad.length) {
        node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="border-t-2 border-current pl-1">{rad.substring(0, relativeCursorPos - 2)}{cursorInRadicandElement}{rad.substring(relativeCursorPos - 2)}</span></span>;
      } else if (hasCursor) {
        const r = <span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{rad}</span></span>;
        node = relativeCursorPos < 2 ? (relativeCursorPos === 0 && index > 0 ? <span key={index}>{r}</span> : <React.Fragment key={index}>{cursorElement}{r}</React.Fragment>) : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
      } else node = <span key={index} className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{rad}</span></span>;
    } else if (part.startsWith('frac{') && part.endsWith('}')) {
      const match = part.match(/frac\{(.*?)\}\{(.*?)\}/s);
      if (match) {
        const [, num, den] = match, nStart = 5, nEnd = nStart + num.length, dStart = part.indexOf('}{') + 2, dEnd = dStart + den.length;
        const rN = () => num
          ? (hasCursor && relativeCursorPos >= nStart && relativeCursorPos <= nEnd
              ? <ExpressionWithCursorDisplay expression={num} cursorPosition={relativeCursorPos - nStart} showCursor embedInFraction />
              : <ExpressionWithCursorDisplay expression={num} cursorPosition={-1} showCursor={false} embedInFraction />)
          : <span className="opacity-0">.</span>;
        const rD = () => den
          ? (hasCursor && relativeCursorPos >= dStart && relativeCursorPos <= dEnd
              ? <ExpressionWithCursorDisplay expression={den} cursorPosition={relativeCursorPos - dStart} showCursor embedInFraction />
              : <ExpressionWithCursorDisplay expression={den} cursorPosition={-1} showCursor={false} embedInFraction />)
          : <span className="opacity-0">.</span>;
        const fE = <span className="inline-flex flex-col items-center text-center align-middle mx-1" style={{ verticalAlign: '-0.5em' }}><span className="px-1 text-2xl border-b-2 border-current leading-normal">{rN()}</span><span className="px-1 text-2xl leading-normal">{rD()}</span></span>;
        const hCI = hasCursor && ((relativeCursorPos >= nStart && relativeCursorPos <= nEnd) || (relativeCursorPos >= dStart && relativeCursorPos <= dEnd));
        node = (hasCursor && !hCI) ? (relativeCursorPos < part.length / 2 ? <React.Fragment key={index}>{cursorElement}{fE}</React.Fragment> : <React.Fragment key={index}>{fE}{cursorElement}</React.Fragment>) : fE;
      } else node = <span key={index}>{part}</span>;
    } else if (part.startsWith('system{') && part.endsWith('}')) {
      const content = part.substring(7, part.length - 1), eqs = content.split(';'), eE = [];
      let pL = 0;
      for (let i = 0; i < eqs.length; i++) {
        const eq = eqs[i], s = 7 + pL, e = s + eq.length;
        eE.push(<div key={i} className="text-left">{hasCursor && relativeCursorPos >= s && relativeCursorPos <= e ? <>{eq.substring(0, relativeCursorPos - s)}{cursorElement}{eq.substring(relativeCursorPos - s)}</> : (eq || <span className="opacity-0">.</span>)}</div>);
        pL += eq.length + 1;
      }
      const sE = <span className="inline-flex items-center align-middle"><span className="text-5xl mr-2 font-thin" style={{lineHeight: '1'}}>{'{'}</span><div className="flex flex-col justify-center">{eE}</div></span>;
      const iCI = hasCursor && relativeCursorPos >= 7 && relativeCursorPos < 7 + content.length + eqs.length;
      node = (hasCursor && !iCI) ? (relativeCursorPos < 7 ? <React.Fragment key={index}>{cursorElement}{sE}</React.Fragment> : <React.Fragment key={index}>{sE}{cursorElement}</React.Fragment>) : sE;
    } else if (part.startsWith('mixfrac{') && part.endsWith('}')) {
      const match = part.match(/mixfrac\{(.*?)\}\{(.*?)\}\{(.*?)\}/s);
      if (match) {
        const [, w, n, d] = match, wS = 8, wE = wS + w.length, nS = wE + 2, nE = nS + n.length, dS = nE + 2, dE = dS + d.length;
        const rW = () => hasCursor && relativeCursorPos >= wS && relativeCursorPos <= wE ? <>{w.substring(0, relativeCursorPos - wS)}{cursorElement}{w.substring(relativeCursorPos - wS)}</> : (w || <span className="opacity-0">.</span>);
        const rN = () => n
          ? (hasCursor && relativeCursorPos >= nS && relativeCursorPos <= nE
              ? <ExpressionWithCursorDisplay expression={n} cursorPosition={relativeCursorPos - nS} showCursor embedInFraction />
              : <ExpressionWithCursorDisplay expression={n} cursorPosition={-1} showCursor={false} embedInFraction />)
          : <span className="opacity-0">.</span>;
        const rD = () => d
          ? (hasCursor && relativeCursorPos >= dS && relativeCursorPos <= dE
              ? <ExpressionWithCursorDisplay expression={d} cursorPosition={relativeCursorPos - dS} showCursor embedInFraction />
              : <ExpressionWithCursorDisplay expression={d} cursorPosition={-1} showCursor={false} embedInFraction />)
          : <span className="opacity-0">.</span>;
        const mFE = <span className="inline-flex items-center align-middle mx-1"><span className="text-3xl">{rW()}</span><span className="inline-flex flex-col items-center text-center align-middle ml-1" style={{ verticalAlign: '-0.5em' }}><span className="px-1 text-2xl border-b-2 border-current leading-normal">{rN()}</span><span className="px-1 text-2xl leading-normal">{rD()}</span></span></span>;
        const hCI = hasCursor && ((relativeCursorPos >= wS && relativeCursorPos <= wE) || (relativeCursorPos >= nS && relativeCursorPos <= nE) || (relativeCursorPos >= dS && relativeCursorPos <= dE));
        node = (hasCursor && !hCI) ? (relativeCursorPos < part.length / 2 ? <React.Fragment key={index}>{cursorElement}{mFE}</React.Fragment> : <React.Fragment key={index}>{mFE}{cursorElement}</React.Fragment>) : mFE;
      } else node = <span key={index}>{part}</span>;
    } else {
      let expIdx = part.indexOf('^(');
      if (expIdx < 0) {
        const careti = part.indexOf('^');
        if (careti >= 0) {
          let p = careti + 1;
          while (p < part.length && part[p] === ' ') p++;
          if (p < part.length && (part[p] === '(' || part[p] === '\uFF08')) expIdx = careti;
        }
      }
      if (expIdx >= 0) {
        let p = expIdx + 1;
        while (p < part.length && part[p] === ' ') p++;
        const openParenAt = p;
        const before = part.substring(0, expIdx);
        const afterOpen = (openParenAt < part.length && (part[openParenAt] === '(' || part[openParenAt] === '\uFF08')) ? part.substring(openParenAt + 1) : part.substring(expIdx + 2);
        const closeP = (c: string) => c === ')' || c === '\uFF09';
        let depth = 0, closeAt = -1;
        for (let i = 0; i < afterOpen.length; i++) {
          if (afterOpen[i] === '(' || afterOpen[i] === '\uFF08') depth++;
          else if (closeP(afterOpen[i])) { if (depth === 0) { closeAt = i; break; } depth--; }
        }
        let expContent = closeAt >= 0 ? afterOpen.substring(0, closeAt) : afterOpen;
        const stripExp = (raw: string, cur: number) => {
          const co = (c: string) => c === '^' || c === '\uFF3E' || (c && c.charCodeAt(0) === 0x5E);
          const op = (c: string) => c === '(' || c === '\uFF08';
          let s = 0; while (s < raw.length && (co(raw[s]) || op(raw[s]) || raw[s] === ' ')) s++;
          let e = raw.length; while (e > s && (closeP(raw[e - 1]) || raw[e - 1] === ' ')) e--;
          const text = raw.substring(s, e);
          const cursor = Math.min(Math.max(0, cur < s ? 0 : cur > e ? e - s : cur - s), text.length);
          return { text, cursor };
        };
        const { text: expDisplay } = stripExp(expContent, 0);
        const expContentEnd = closeAt >= 0 ? closeAt : afterOpen.length;
        const contentStartInPart = openParenAt + 1;
        const expWrap = (inner: React.ReactNode) => <sup className="result-exponent align-baseline">{inner}</sup>;
        let cursorInBefore = hasCursor && relativeCursorPos <= expIdx ? relativeCursorPos : -1;
        let cursorInExp = hasCursor && relativeCursorPos >= contentStartInPart && relativeCursorPos <= contentStartInPart + expContentEnd ? relativeCursorPos - contentStartInPart : -1;
        if (cursorInExp >= 0 && cursorInExp > expContent.length) cursorInExp = expContent.length;
        const { cursor: displayCursor } = stripExp(expContent, cursorInExp >= 0 ? cursorInExp : 0);
        const expEndInPart = contentStartInPart + expContentEnd;
        const cursorAfterExp = hasCursor && relativeCursorPos > expEndInPart && relativeCursorPos < part.length;
        if (cursorInBefore >= 0) {
          node = <span key={index}>{before.substring(0, cursorInBefore)}{cursorElement}{before.substring(cursorInBefore)}{expWrap(expDisplay ? <MathRenderer expression={expDisplay} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>)}</span>;
        } else if (cursorInExp >= 0 && cursorInExp <= expContent.length) {
          node = <span key={index}>{before}{expWrap(<ExpressionWithCursorDisplay expression={expContent} cursorPosition={cursorInExp} showCursor />)}</span>;
        } else if (cursorAfterExp) {
          node = <span key={index}>{before}{expWrap(expDisplay ? <MathRenderer expression={expDisplay} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>)}{cursorElement}</span>;
        } else {
          node = <span key={index}>{before}{expWrap(expDisplay ? <MathRenderer expression={expDisplay} className="result-exponent-inner" /> : <span className="result-exponent-inner">&nbsp;</span>)}</span>;
        }
      } else {
        const digitDoubleRootMatch = part.match(/^(\d+)√√\(/);
        if (digitDoubleRootMatch) {
          const degStr = digitDoubleRootMatch[1];
          const openP = part.indexOf('(', degStr.length + 2);
          let depth = 1, closeP = openP + 1;
          while (closeP < part.length && depth > 0) {
            if (part[closeP] === '(' || part[closeP] === '\uFF08') depth++;
            else if (part[closeP] === ')' || part[closeP] === '\uFF09') depth--;
            closeP++;
          }
          const rad = depth === 0 ? part.substring(openP + 1, closeP - 1) : '';
          const radDisplay = rad ? unwrapRadicandLegacy(rad).display : '';
          const degDisplay = degStr || '';
          const degSupD = degDisplay ? <sup className="root-degree-n">{degDisplay}</sup> : null;
          const rStart = openP + 1;
          const radDispCur = Math.max(0, Math.min(radDisplay.length, (relativeCursorPos - rStart) - (rad ? unwrapRadicandLegacy(rad).startOff : 0)));
          if (hasCursor && relativeCursorPos >= rStart && relativeCursorPos <= openP + 1 + rad.length) {
            node = <span key={index} className="inline-flex items-baseline">{degSupD}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay.substring(0, radDispCur)}{cursorInRadicandElement}{radDisplay.substring(radDispCur)}</span></span></span>;
          } else if (hasCursor && relativeCursorPos < degStr.length) {
            node = <span key={index}><span>{part.substring(0, relativeCursorPos)}{cursorElement}{part.substring(relativeCursorPos, degStr.length)}</span>{degSupD}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
          } else if (hasCursor) {
            const r = <span key={index} className="inline-flex items-baseline">{degSupD}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
            node = relativeCursorPos <= degStr.length + 2 ? <React.Fragment key={index}>{cursorElement}{r}</React.Fragment> : <React.Fragment key={index}>{r}{relativeCursorPos === part.length ? cursorWithIndentAfterRoot : cursorElement}</React.Fragment>;
          } else {
            node = <span key={index} className="inline-flex items-baseline">{degSupD}<span className="root-container"><span className="root-symbol">√</span><span className="radicand border-t-2 border-current pl-1">{radDisplay}</span></span></span>;
          }
        } else {
          const degreeParenRootMatch = part.match(/^(\d*)\]\(\)√(.*)$/);
          if (degreeParenRootMatch) {
            const [, degStr, rad] = degreeParenRootMatch;
            const degDisplay = (degStr === '' || degStr === undefined) ? '' : degStr;
            const degreeIs2or3Lead = degDisplay === '' || degDisplay === '3';
            const degSupLead = degDisplay ? <sup className="root-degree-n">{degDisplay}</sup> : null;
            const sqrtIdx = part.indexOf('√');
            const cursorInDegreeOrGapLead = degreeIs2or3Lead && hasCursor && relativeCursorPos > 0 && relativeCursorPos <= sqrtIdx;
            const radSpan = cursorInDegreeOrGapLead
              ? <span className="radicand border-t-2 border-current pl-1">{cursorInRadicandElement}{rad}</span>
              : hasCursor && relativeCursorPos >= sqrtIdx + 1 && relativeCursorPos <= part.length
              ? <span className="radicand border-t-2 border-current pl-1">{rad.substring(0, relativeCursorPos - sqrtIdx - 1)}{cursorInRadicandElement}{rad.substring(relativeCursorPos - sqrtIdx - 1)}</span>
              : <span className="radicand border-t-2 border-current pl-1">{rad}</span>;
            const rootBlock = <span className="root-container"><span className="root-symbol">√</span>{radSpan}</span>;
            const lead = (hasCursor && relativeCursorPos <= sqrtIdx && !cursorInDegreeOrGapLead) ? (
              relativeCursorPos === 0 ? <>{cursorElement}{degSupLead}</>
              : relativeCursorPos <= sqrtIdx - 3 ? <>{degDisplay ? <sup className="root-degree-n">{degDisplay.substring(0, relativeCursorPos)}{cursorElement}{degDisplay.substring(relativeCursorPos)}</sup> : supCursorElement}</>
              : <>{degSupLead}</>
            ) : <>{degSupLead}</>;
            node = <span key={index}>{lead}{rootBlock}</span>;
          } else if (part.startsWith('[') && part.includes('√')) {
            const sqrtIdx = part.indexOf('√');
            if (sqrtIdx >= 1) {
              const degStr = part.substring(1, sqrtIdx).replace(/[\s\]\uFF3D]+$/, '').trim();
              const degDisplay = (degStr === '' || degStr === '-') ? '' : rootDegreeForDisplayLegacy(degStr);
              const degreeIs2or3L = degDisplay === '' || degDisplay === '3';
              const degSupL = degDisplay ? <sup className="root-degree-n">{degDisplay}</sup> : null;
              let rad = '';
              let tail = '';
              const openP = part.indexOf('(', sqrtIdx);
              if (openP >= sqrtIdx) {
                let depth = 1, closeP = openP + 1;
                while (closeP < part.length && depth > 0) {
                  if (part[closeP] === '(' || part[closeP] === '\uFF08') depth++;
                  else if (part[closeP] === ')' || part[closeP] === '\uFF09') depth--;
                  closeP++;
                }
                if (depth === 0) {
                  rad = part.substring(openP + 1, closeP - 1);
                  tail = part.substring(closeP);
                }
              }
              if (rad === '' && tail === '') {
                let radEnd = part.length;
                for (let i = sqrtIdx + 1; i < part.length; i++) {
                  if ('+−×÷'.includes(part[i])) { radEnd = i; break; }
                }
                rad = part.substring(sqrtIdx + 1, radEnd);
                tail = part.substring(radEnd);
              }
              if (rad !== undefined) {
                const cursorInDegreeOrGapL = degreeIs2or3L && hasCursor && relativeCursorPos > 0 && relativeCursorPos <= sqrtIdx;
                const radSpan = cursorInDegreeOrGapL
                  ? <span className="radicand border-t-2 border-current pl-1">{cursorInRadicandElement}{rad}</span>
                  : hasCursor && relativeCursorPos >= sqrtIdx + 1 && relativeCursorPos <= sqrtIdx + rad.length
                  ? <span className="radicand border-t-2 border-current pl-1">{rad.substring(0, relativeCursorPos - sqrtIdx - 1)}{cursorInRadicandElement}{rad.substring(relativeCursorPos - sqrtIdx - 1)}</span>
                  : <span className="radicand border-t-2 border-current pl-1">{rad}</span>;
                const tailSpan = tail ? (hasCursor && relativeCursorPos > sqrtIdx + rad.length
                  ? <span>{tail.substring(0, relativeCursorPos - sqrtIdx - rad.length)}{cursorElement}{tail.substring(relativeCursorPos - sqrtIdx - rad.length)}</span>
                  : <span>{tail}</span>) : (hasCursor && relativeCursorPos === sqrtIdx + rad.length ? <span>{cursorElement}</span> : null);
                const rootBlock = <span className="root-container"><span className="root-symbol">√</span>{radSpan}</span>;
                const lead = (hasCursor && relativeCursorPos <= sqrtIdx && !cursorInDegreeOrGapL) ? (
                  relativeCursorPos === 0 ? <>{cursorElement}{degSupL}</>
                  : relativeCursorPos < sqrtIdx ? <>{degDisplay ? <sup className="root-degree-n">{degDisplay.substring(0, relativeCursorPos - 1)}{cursorElement}{degDisplay.substring(relativeCursorPos - 1)}</sup> : supCursorElement}</>
                  : <>{degSupL}</>
                ) : <>{degSupL}</>;
                node = <span key={index}>{lead}{rootBlock}{tailSpan}</span>;
              }
            }
          } else if (part.includes('log[')) {
          const segments: Array<{ type: 'text' | 'log'; start: number; end: number; text?: string; base?: string; arg?: string }> = [];
          let pos = 0;
          while (pos < part.length) {
            const idx = part.indexOf('log[', pos);
            if (idx === -1) {
              if (pos < part.length) segments.push({ type: 'text', start: pos, end: part.length, text: part.substring(pos) });
              break;
            }
            if (idx > pos) segments.push({ type: 'text', start: pos, end: idx, text: part.substring(pos, idx) });
            const parsed = parseOneLog(part, idx);
            if (parsed) {
              segments.push({ type: 'log', start: idx, end: parsed.end, base: parsed.base, arg: parsed.arg });
              pos = parsed.end;
            } else {
              segments.push({ type: 'text', start: idx, end: idx + 4, text: part.substring(idx, idx + 4) });
              pos = idx + 4;
            }
          }
          node = (
            <span key={index} className="inline-flex items-baseline flex-wrap">
              {segments.map((seg, segIdx) => {
                if (seg.type === 'text' && seg.text !== undefined) {
                  const cursorInSeg = hasCursor && relativeCursorPos >= seg.start && relativeCursorPos <= seg.end;
                  const relInSeg = relativeCursorPos - seg.start;
                  if (cursorInSeg) {
                    return <React.Fragment key={segIdx}>{seg.text.substring(0, relInSeg)}{cursorElement}{seg.text.substring(relInSeg)}</React.Fragment>;
                  }
                  return <React.Fragment key={segIdx}>{seg.text}</React.Fragment>;
                }
                if (seg.type === 'log' && seg.base !== undefined && seg.arg !== undefined) {
                  const localCur = relativeCursorPos - seg.start;
                  const baseStartLocal = 4;
                  const baseEndLocal = 4 + seg.base.length;
                  const openParenLocal = baseEndLocal + (part[seg.start + baseEndLocal] === ']' && part[seg.start + baseEndLocal + 1] === ' ' ? 2 : 1);
                  const argStartLocal = openParenLocal + 1;
                  const argEndLocal = argStartLocal + seg.arg.length;
                  const cursorInBase = hasCursor && localCur >= baseStartLocal && localCur <= baseEndLocal;
                  const cursorInGap = hasCursor && localCur > baseEndLocal && localCur < argStartLocal;
                  const cursorInArg = hasCursor && localCur >= argStartLocal && localCur < argEndLocal;
                  const cursorBeforeCloseParen = hasCursor && localCur === argEndLocal && relativeCursorPos < seg.end;
                  const cursorAfterLog = hasCursor && relativeCursorPos > seg.end;
                  const cursorBeforeLog = hasCursor && relativeCursorPos === seg.start;
                  const relInBase = localCur - baseStartLocal;
                  const relInArg = localCur - argStartLocal;
                  const displayArgCur = cursorInGap ? 0 : (cursorInArg ? relInArg : -1);
                  const baseWithCur = cursorInBase ? <span className="log-base-sub">{seg.base.substring(0, relInBase)}{subCursorElement}{seg.base.substring(relInBase)}</span> : <span className="log-base-sub">{seg.base}</span>;
                  const argWithCur = displayArgCur >= 0 ? <span>{seg.arg.substring(0, displayArgCur)}{cursorElement}{seg.arg.substring(displayArgCur)}</span> : <span>{seg.arg}</span>;
                  return (
                    <span key={segIdx} className="inline-flex items-baseline">
                      {cursorBeforeLog ? cursorElement : null}
                      {localCur >= 0 && localCur <= 3 ? <span>{'log'.substring(0, localCur)}{cursorElement}{'log'.substring(localCur)}</span> : 'log'}
                      {localCur > 3 && localCur < baseStartLocal ? cursorElement : null}
                      {baseWithCur}
                      ({argWithCur}{cursorBeforeCloseParen ? cursorElement : null})
                      {cursorAfterLog ? cursorElement : null}
                    </span>
                  );
                }
                return null;
              })}
            </span>
          );
        }
        }
        if (node == null) {
          const nextPart = index + 1 < parts.length ? parts[index + 1] : '';
          const nextIsRoot = nextPart.length > 0 && (/^\s*[√\u221A]/.test(nextPart) || nextPart.startsWith('√') || nextPart.charCodeAt(0) === 0x221A);
          const prevIsRoot = index > 0 && (parts[index - 1].startsWith('√') || (parts[index - 1].length > 0 && parts[index - 1].charCodeAt(0) === 0x221A));
          const cursorAtStartAfterRoot = hasCursor && relativeCursorPos === 0 && prevIsRoot;
          if (hasCursor && relativeCursorPos >= 0 && relativeCursorPos <= part.length && !cursorAtStartAfterRoot) node = <span key={index}>{part.substring(0, relativeCursorPos)}{cursorElementPlain}{part.substring(relativeCursorPos)}</span>;
          else node = <span key={index}>{part}</span>;
        }
      }
    }
    const prevPart = index > 0 ? parts[index - 1] : '';
    const prevEndsWithDigit = prevPart.length > 0 && /[\d.]/.test(prevPart.slice(-1));
    const prevEndsWithOperator = prevPart.length > 0 && (prevPart.slice(-1) === '+' || prevPart.slice(-1) === '-');
    const partIsRoot = part.startsWith('√') || (part.length > 0 && part.charCodeAt(0) === 0x221A);
    const needGapBeforeRootLegacy = (prevEndsWithDigit || prevEndsWithOperator) && partIsRoot && node;
    if (needGapBeforeRootLegacy) {
      const gapStyle: React.CSSProperties = { display: 'inline-block', width: 12, minWidth: 8, overflow: 'hidden', verticalAlign: 'baseline' };
      node = <span key={`root-margin-${index}`}><span style={gapStyle} aria-hidden>{'\u00A0'}</span>{node}</span>;
    }
    const needGapAfterRootLegacy = partIsRoot && node && index + 1 < parts.length;
    if (needGapAfterRootLegacy) {
      node = <span key={`root-after-${index}`} style={{ display: 'inline-flex', marginRight: 12 }}>{node}</span>;
    }
    if (hasCursor && effectiveCursorPosition === partEnd && partEnd === expression.length) cursorRenderedAtEnd = true;
    resultElements.push(node!);
    processedLength = partEnd;
  });

  if (effectiveCursorPosition >= expression.length && effectiveCursorPosition >= 0 && expression.length > 0 && !cursorRenderedAtEnd) resultElements.push(cursorElement);

  const content = <>{resultElements}</>;
  return (
    <>
      <style>{`
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
        .root-container { display: inline-flex !important; align-items: flex-start !important; }
        .cursor-in-radicand { position: relative !important; top: -0.35em !important; }
        .root-symbol { display: inline-block !important; line-height: 1 !important; vertical-align: top !important; color: inherit !important; margin-right: 2px !important; }
        .radicand { font-variant: normal !important; border-top-width: 2px !important; padding-left: 12px !important; min-width: 20px !important; }
        .fraction-part-display { display: inline-block !important; min-height: 1em !important; }
        .fraction-part-display span.animate-pulse { min-height: 1em !important; vertical-align: middle !important; }
        .root-coeff-margin { margin-left: 12px !important; display: inline-block !important; }
        .log-base-sub { font-size: 0.85em !important; vertical-align: sub !important; display: inline-block !important; line-height: 1 !important; }
      `}</style>
      {embedInFraction ? <span className="fraction-part-display">{content}</span> : content}
    </>
  );
};

export default ExpressionWithCursorDisplay;
