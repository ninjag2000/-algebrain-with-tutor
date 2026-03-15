import { PracticeQuestion, DailyChallenge, Achievement, PlayerLevel, type DifficultyLevel } from './types';
import { getSkillFromQuestion } from './screens/assessment/getSkillFromQuestion';
import type { SkillKey } from './screens/assessment/types';

/** Простой псевдо-рандом по семени (для детерминированной генерации по дню) */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** Генерация одного числа от min до max (включительно) по рандому r */
function int(r: () => number, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

/** Вспомогательный тип: вопрос из шаблона (difficulty подменяется на уровень 1–7). */
type TemplateQuestion = { question: string; answer: string; difficulty: number; acceptedAnswers?: string[] };

/** Тиры 1–7: у каждого навыка 7 уровней сложности. */
function buildTiersBySkill(r: () => number): Record<SkillKey, Array<Array<() => TemplateQuestion>>> {
  const pickP = () => [10, 20, 25, 50][int(r, 0, 3)]!;
  const pickN = () => [50, 60, 80, 90, 100, 120, 150, 160, 200][int(r, 0, 8)]!;

  const arithmetic = (): Record<SkillKey, Array<Array<() => TemplateQuestion>>>['arithmetic'] => [
    /* Тир 1: все текущие задания (тиры 2–7 пока пустые, ждём примеры) */ [
      () => { const a = int(r, 5, 30), b = int(r, 5, 30); return { question: `${a} + ${b}`, answer: String(a + b), difficulty: 1 }; },
      () => { const a = int(r, 20, 50), b = int(r, 5, 15); return { question: `${a} - ${b}`, answer: String(a - b), difficulty: 1 }; },
      () => { const a = int(r, 2, 9), b = int(r, 2, 9); return { question: `${a} * ${b}`, answer: String(a * b), difficulty: 1 }; },
      () => { const b = int(r, 2, 9), c = int(r, 2, 9); const a = b * c; return { question: `${a} / ${b}`, answer: String(c), difficulty: 1 }; },
      () => { const a = int(r, 5, 25), b = int(r, 3, 20), c = int(r, 2, 15); return { question: `${a} + ${b} - ${c}`, answer: String(a + b - c), difficulty: 1 }; },
      () => { const a = int(r, 30, 60), b = int(r, 5, 20), c = int(r, 3, 15); return { question: `${a} - ${b} + ${c}`, answer: String(a - b + c), difficulty: 1 }; },
      () => { const a = int(r, 2, 6), b = int(r, 2, 8), c = int(r, 1, 10); return { question: `${a} * ${b} + ${c}`, answer: String(a * b + c), difficulty: 1 }; },
      () => { const b = int(r, 2, 8), q = int(r, 3, 12), c = int(r, 2, 8); const a = b * q; return { question: `${a} / ${b} + ${c}`, answer: String(q + c), difficulty: 1 }; },
      () => { const p = pickP(), N = pickN(); return { question: `${N} * ${p}%`, answer: String(Math.round((N * p) / 100)), difficulty: 1 }; },
      () => { const a = int(r, 10, 50), b = int(r, 5, 25), c = int(r, 3, 20); return { question: `${a} + ${b} - ${c}`, answer: String(a + b - c), difficulty: 1 }; },
      () => { const p = pickP(), N = pickN(), k = [5, 10, 15, 20][int(r, 0, 3)]!; return { question: `${N} * ${p}% + ${k}`, answer: String(Math.round((N * p) / 100 + k)), difficulty: 1 }; },
      () => { const p = pickP(), N = pickN(); return { question: `${N} - ${p}%`, answer: String(Math.round(N * (1 - p / 100))), difficulty: 1 }; },
      () => { const k = [10, 20, 30, 50][int(r, 0, 3)]!, p = pickP(), N = pickN(); return { question: `${k} + ${N} * ${p}%`, answer: String(k + Math.round((N * p) / 100)), difficulty: 1 }; },
      () => { const p1 = pickP(), p2 = pickP(), N = pickN(); const a = Math.round((N * p1) / 100), b = Math.round((N * p2) / 100); return { question: `${N} * ${p1}% + ${N} * ${p2}%`, answer: String(a + b), difficulty: 1 }; },
      () => { const a = int(r, 2, 6), b = int(r, 1, 10), c = int(r, 5, 20); const x = (c - b) * a; return { question: `frac{x}{${a}} + ${b} = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { const N = pickN(), p = pickP(), xVal = int(r, 2, 8), coef = 5; const k = Math.round((N * p) / 100); return { question: `${N} * ${p}% + ${coef}x = ${k + coef * xVal}`, answer: String(xVal), difficulty: 1 }; },
      () => { const a = int(r, 20, 60), b = int(r, 2, 10), c = int(r, 2, 10); const q = Math.floor(a / b); if (q * b !== a) return { question: '20 / 4 - 2', answer: '3', difficulty: 1 }; return { question: `${a} / ${b} - ${c}`, answer: String(q - c), difficulty: 1 }; },
      () => { const a = int(r, 10, 40), b = int(r, 5, 25), c = int(r, 3, 15), d = int(r, 2, 10); return { question: `${a} - ${b} + ${c} * ${d}`, answer: String(a - b + c * d), difficulty: 1 }; },
      () => { const a = int(r, 2, 5), x = a * int(r, 2, 10), b = int(r, 1, 8), d = int(r, 2, 10); const c = x / a + b - d; return { question: `frac{x}{${a}} + ${b} - ${d} = ${c}`, answer: String(x), difficulty: 1, acceptedAnswers: [String(x) + '.0'] }; },
      () => { const N = pickN(), p = pickP(), k = [10, 15, 20][int(r, 0, 2)]!; return { question: `${N} * ${p}% - ${k}`, answer: String(Math.max(0, Math.round((N * p) / 100) - k)), difficulty: 1 }; },
      () => { const a = int(r, 5, 15), b = int(r, 5, 15), c = int(r, 2, 8); return { question: `(${a} + ${b}) * ${c}`, answer: String((a + b) * c), difficulty: 1 }; },
      () => { const a = int(r, 3, 12), b = int(r, 3, 12), c = int(r, 2, 8), d = int(r, 2, 8); return { question: `${a} * ${b} + ${c} * ${d}`, answer: String(a * b + c * d), difficulty: 1 }; },
      () => { const a = int(r, 8, 25), b = int(r, 3, 12), c = int(r, 2, 6), d = int(r, 1, 10); return { question: `(${a} - ${b}) * ${c} + ${d}`, answer: String((a - b) * c + d), difficulty: 1 }; },
      () => { const N = pickN(), p = pickP(), k = int(r, 5, 25); return { question: `${N} - ${N} * ${p}% + ${k}`, answer: String(Math.round(N * (1 - p / 100) + k)), difficulty: 1 }; },
      () => { const a = int(r, 4, 12), b = int(r, 4, 12), c = int(r, 2, 8), d = int(r, 2, 8), e = int(r, 1, 15); return { question: `${a} * ${b} - ${c} * ${d} + ${e}`, answer: String(a * b - c * d + e), difficulty: 1 }; },
      () => { const N = int(r, 80, 200), M = int(r, 50, 150), p = pickP(), q = pickP(); return { question: `${N} * ${p}% + ${M} * ${q}%`, answer: String(Math.round((N * p) / 100 + (M * q) / 100)), difficulty: 1 }; },
      () => { const a = int(r, 5, 20), b = int(r, 5, 20), c = int(r, 2, 10), d = int(r, 2, 10); return { question: `(${a} + ${b}) * (${c} - ${d})`, answer: String((a + b) * (c - d)), difficulty: 1 }; },
      () => { const N = pickN(), p1 = pickP(), p2 = pickP(), k = int(r, 10, 40); const v1 = Math.round((N * p1) / 100), v2 = Math.round((N * p2) / 100); return { question: `${N} * ${p1}% + ${N} * ${p2}% - ${k}`, answer: String(Math.max(0, v1 + v2 - k)), difficulty: 1 }; },
      () => { const a = int(r, 25, 70), b = int(r, 3, 12), c = int(r, 3, 12); const q = Math.floor(a / b); if (q * b !== a) return { question: '36 / 4 - 3', answer: '6', difficulty: 1 }; return { question: `${a} / ${b} - ${c}`, answer: String(q - c), difficulty: 1 }; },
      () => { const N = pickN(), p = pickP(), xVal = int(r, 2, 10), coef = int(r, 3, 8); const k = Math.round((N * p) / 100); return { question: `${N} * ${p}% + ${coef}x = ${k + coef * xVal}`, answer: String(xVal), difficulty: 1 }; },
    ],
    /* Тир 2: степени и корни */ [
      () => { const a = int(r, 2, 5), m = int(r, -4, -1), n = int(r, 3, 7); const exp = m + n; const ans = Math.pow(a, exp); return { question: `${a}^(${m}) · ${a}^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const a = int(r, 3, 9), m = int(r, 2, 6); return { question: `${a}^(-${m}) · ${a}^(${m})`, answer: '1', difficulty: 2 }; },
      () => { const a = int(r, 5, 12), m = int(r, 4, 9), n = int(r, 2, Math.min(5, m - 1)); const exp = m - n; const ans = Math.pow(a, exp); return { question: `${a}^(${m}) : ${a}^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const a = int(r, 2, 6), m = int(r, -9, -5), n = int(r, -7, -3); const exp = m - n; return { question: `${a}^(${m}) : ${a}^(${n})`, answer: exp >= 0 ? String(Math.pow(a, exp)) : `1/${Math.pow(a, -exp)}`, difficulty: 2 }; },
      () => { const a = int(r, 2, 5), m = int(r, 2, 4), n = int(r, 2, 3); const ans = Math.pow(a, m * n); return { question: `(${a}^(${m}))^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const b = [0.1, 0.2][int(r, 0, 1)]!; const m = 3; const n = -1; const ans = Math.pow(b, m * n); return { question: `(${b}^(${m}))^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const b = int(r, 2, 10), q = int(r, 2, 5); const a = b * q; const n = int(r, 3, 6); const ans = Math.pow(q, n); return { question: `${a}^(${n}) · (1/${b})^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const a = int(r, 10, 40), b = int(r, 2, 15); if (a % b !== 0) return { question: '38^(4) / 19^(4)', answer: '16', difficulty: 2 }; const q = a / b; const n = int(r, 2, 5); const ans = Math.pow(q, n); return { question: `${a}^(${n}) / ${b}^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const k1 = [36, 49, 64, 81, 100][int(r, 0, 4)]!, k2 = [4, 9, 16, 25][int(r, 0, 3)]!; const d = int(r, 2, 5); const num = k2 * d * d; return { question: `sqrt(${k1}) - sqrt(${num}/${k2})`, answer: String(Math.sqrt(k1) - Math.sqrt(num / k2)), difficulty: 2, acceptedAnswers: [String(Math.round((Math.sqrt(k1) - Math.sqrt(num / k2)) * 1000) / 1000)] }; },
      () => { const a = [16, 25, 36, 49, 64, 81][int(r, 0, 5)]!, b = [9, 16, 25, 36, 49][int(r, 0, 4)]!; const c = int(r, 2, 5); const rootB = Math.sqrt(b); const ans = 2 * Math.sqrt(a) + rootB / c; return { question: `2·sqrt(${a}) + sqrt(${b})/${c}`, answer: String(ans), difficulty: 2, acceptedAnswers: Number.isInteger(ans) ? undefined : [String(Math.round(ans * 1000) / 1000)] }; },
      () => { const a = int(r, 2, 8), b = [9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169][int(r, 0, 10)]!; return { question: `(sqrt(${a}))^(2) - sqrt(${b})`, answer: String(a - Math.sqrt(b)), difficulty: 2 }; },
      () => { const a = int(r, 2, 5), m = int(r, -3, -1), n = int(r, 2, 6); const ans = Math.pow(a, m + n); return { question: `${a}^(${m})·${a}^(${n})`, answer: String(ans), difficulty: 2 }; },
      () => { const a = int(r, 2, 8); return { question: `(${a}^(2))^(2)`, answer: String(a * a * a * a), difficulty: 2 }; },
      () => { const k = int(r, 2, 12); const sq = k * k; return { question: `sqrt(${sq})`, answer: String(k), difficulty: 2 }; },
      () => { const a = int(r, 2, 8), b = int(r, 2, 8); const c = a * a + b; const root = Math.sqrt(c); if (root !== Math.floor(root)) return { question: 'sqrt(36) + sqrt(9)', answer: '9', difficulty: 2 }; return { question: `sqrt(${c}) + sqrt(${b})`, answer: String(root + Math.sqrt(b)), difficulty: 2 }; },
      () => { const n = int(r, 10, 80), d = int(r, 2, 6); if (n % d !== 0) return { question: 'sqrt(36) - sqrt(4)', answer: '4', difficulty: 2 }; const q = n / d; return { question: `sqrt(${n * d}) - sqrt(${d})`, answer: String(Math.sqrt(n * d) - Math.sqrt(d)), difficulty: 2 }; },
    ],
    /* Тир 3: алгебраические дроби (сложение/вычитание, упрощение) */ [
      () => { const d = int(r, 2, 6); const k = d * d; const c = int(r, 1, d - 1); return { question: `a/(a^(2)-${k}) + ${c}/(a^(2)-${k}) = ?`, answer: `1/(a-${d})`, difficulty: 3 }; },
      () => { const d = int(r, 2, 10), n = d * d; return { question: `x^(2)/(x-${d}) - ${n}/(x-${d}) = ?`, answer: `x+${d}`, difficulty: 3 }; },
      () => { const coef = int(r, 2, 8); return { question: `${coef}m/(m^(2)-n^(2)) + ${coef}n/(m^(2)-n^(2)) = ?`, answer: `${coef}/(m-n)`, difficulty: 3 }; },
      () => { const p = int(r, 2, 5), q = p * p; return { question: `${2 * q}/(b^(2)-${q}) - ${2 * p}b/(b^(2)-${q}) = ?`, answer: `-2/(b+${p})`, difficulty: 3 }; },
      () => { const d = int(r, 2, 5); const k = d * d; return { question: `a^(2)/(a^(2)-${k}b^(2)) + (${2 * d}ab+${k}b^(2))/(a^(2)-${k}b^(2)) = ?`, answer: `(a+${d}b)/(a-${d}b)`, difficulty: 3 }; },
      () => { const c1 = int(r, 3, 9), c2 = int(r, 2, c1 - 1); const sum = c1 + c2; return { question: `(y^(2)+${sum}y)/(y^(2)-1) - (${c1 + 1}y-1)/(y^(2)-1) = ?`, answer: '(y+1)/(y-1)', difficulty: 3 }; },
      () => { const c1 = int(r, 2, 6), c2 = int(r, 1, c1); return { question: `(a^(2)+${c1}a)/(a-1) + (${2 * c2}a-${2 * c2})/(a-1) = ?`, answer: `a+${2 * c2}`, difficulty: 3 }; },
      () => { const d = int(r, 2, 5); const b = 1 + d, c = d; const disc = (b + c) * (b + c) - 4 * b * c; if (disc < 0) return { question: 'x^(2)/(x^(2)-4x+3) - 1/(x^(2)-4x+3) = ?', answer: '(x+1)/(x-3)', difficulty: 3 }; const r1 = 1, r2 = d; return { question: `x^(2)/(x^(2)-${b + c}x+${b * c}) - 1/(x^(2)-${b + c}x+${b * c}) = ?`, answer: `(x+1)/(x-${d})`, difficulty: 3 }; },
      () => { const ks = [4, 9, 16, 25], k = ks[int(r, 0, 3)]!, c = Math.sqrt(k); return { question: `a/(a^(2)-${k}) + ${c}/(a^(2)-${k}) = ?`, answer: `1/(a-${c})`, difficulty: 3 }; },
      () => { const d = int(r, 2, 8), n = d * d; return { question: `x^(2)/(x-${d}) - ${n}/(x-${d}) = ?`, answer: `x+${d}`, difficulty: 3 }; },
      () => { const coef = int(r, 2, 6); return { question: `${coef}m/(m^(2)-n^(2)) + ${coef}n/(m^(2)-n^(2)) = ?`, answer: `${coef}/(m-n)`, difficulty: 3 }; },
      () => { const p = int(r, 2, 5), q = p * p; return { question: `${q}/(b^(2)-${q}) - ${2*p}b/(b^(2)-${q}) = ?`, answer: `-2/(b+${p})`, difficulty: 3 }; },
    ],
    /* Тир 4: вычитание дробей с разными знаменателями */ [
      () => { const c1 = int(r, 2, 5); const num = c1 === 2 ? 'y-8' : c1 === 3 ? '2y-13' : c1 === 4 ? '3y-18' : '4y-23'; return { question: `${c1}/(y^(2)-3y+2) - 1/(y^(2)-6y+5) = ?`, answer: `(${num})/((y-1)(y-2)(y-5))`, difficulty: 4 }; },
      () => { const p = int(r, 2, 5), q = p + int(r, 2, 4); const num = (q - p) * (q - p); return { question: `(a-${p})/(a^(2)-${p + q}a+${p * q}) - (a-${q})/(a^(2)-${p + q - 2}a+${(p - 1) * (q - 1)}) = ?`, answer: `${num}/((a-${p})(a-${q}))`, difficulty: 4 }; },
      () => { const d = int(r, 2, 5); const num = -d - 1; return { question: `(a-${d})/(a^(2)-2a+1) - (a+${d})/(a^(2)+a-2) = ?`, answer: `${num}/(a-1)^(2)`, difficulty: 4 }; },
      () => { const c1 = int(r, 2, 4); const num = c1 === 2 ? 'y-8' : c1 === 3 ? '2y-13' : '3y-18'; return { question: `${c1}/(y^(2)-3y+2) - 1/(y^(2)-6y+5) = ?`, answer: `(${num})/((y-1)(y-2)(y-5))`, difficulty: 4 }; },
    ],
    /* Тир 5: дроби с корнями и рациональные выражения */ [
      () => { const c = int(r, 1, 4); return { question: `sqrt(a)/(sqrt(a)-sqrt(b)) - sqrt(b)/(sqrt(a)+sqrt(b)) = ?`, answer: '(a+b)/(a-b)', difficulty: 5 }; },
      () => { const t = int(r, 1, 6); return { question: `(sqrt(x)-${t})/(sqrt(x)+${t}) + (sqrt(x)+${t})/(sqrt(x)-${t}) = ?`, answer: `2(x+${t * t})/(x-${t * t})`, difficulty: 5 }; },
      () => { const k1 = int(r, 4, 15), k2 = int(r, 2, 8); return { question: `${k1}·sqrt(m)/(n-m) + ${k2}/(sqrt(n)+sqrt(m)) = ?`, answer: `${k2}(sqrt(m)+sqrt(n))/(n-m)`, difficulty: 5 }; },
      () => { const b = int(r, 2, 8); return { question: `sqrt(b)/(sqrt(b)-1) - sqrt(b)/(b-1) = ?`, answer: 'b/(b-1)', difficulty: 5 }; },
      () => { const d = int(r, 2, 5); return { question: `(1/(x+x·sqrt(y)) + 1/(x-x·sqrt(y))) · ((y-1)/${2 * d}) = ?`, answer: `-1/${d}x`, difficulty: 5 }; },
      () => { const k = int(r, 1, 4); return { question: `((x+sqrt(x))/(sqrt(x)+1) - ${k}·sqrt(x) - ${k - 1}) · (${k}-sqrt(x)) = ?`, answer: 'x-1', difficulty: 5 }; },
      () => { const a = int(r, 2, 5), b = int(r, 2, 5); const c = a * b; return { question: `(${c}y^(2)-${a * a})/(${b}y^(2)-7y+3) : (3+${b}y)/(1-${b}y) + (9-${c}y)/(3-y) = ?`, answer: '2', difficulty: 5 }; },
      () => { const k = int(r, 2, 6); return { question: `((${k}x-x^(2))/(x^(2)-${2 * k}x+9) + ${k}x/(2x+5)) · (2x^(2)-x-15) = ?`, answer: `-${5 + k * 2}x`, difficulty: 5 }; },
      () => { const d = int(r, 2, 5); return { question: `(a/(a^(2)-${2 * d}a+${d * d}) - (a+${d})/(a^(2)-a-6)) · (2a-${2 * d})^(2) = ?`, answer: String(4 * (d + 2)), difficulty: 5 }; },
      () => { const q = int(r, 2, 6); return { question: `(p/(3p^(2)+p-2) + ${q * q}/(9p^(2)-4)) : ((3p+4)/(9p^(2)-4)) - 1/(p+1) = ?`, answer: '1', difficulty: 5 }; },
      () => { const t = int(r, 2, 5); return { question: `(sqrt(x)-1)/(sqrt(x)+1) + (sqrt(x)+1)/(sqrt(x)-1) = ?`, answer: '2(x+1)/(x-1)', difficulty: 5 }; },
      () => { const b = int(r, 2, 6); return { question: `sqrt(b)/(sqrt(b)-1) - sqrt(b)/(b-1) = ?`, answer: 'b/(b-1)', difficulty: 5 }; },
      () => { const k = int(r, 2, 8), val = int(r, 2, 12); return { question: `${k}^(log[${k}](${val}))`, answer: String(val), difficulty: 5 }; },
      () => { const base = int(r, 2, 9), val = int(r, 2, 12); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 5 }; },
    ],
    /* Тир 6: многоэтажные дроби и сложные выражения */ [
      () => ({ question: '1/(a - 3/(b + 1/c)) · 3/(c + 1/b) - 3b/(abc + a - 3c) = ?', answer: '0', difficulty: 6 }),
      () => ({ question: '(x + sqrt(x) + y - sqrt(y) - 2·sqrt(xy))/(sqrt(x) - sqrt(y)) = ?', answer: 'sqrt(x) - sqrt(y) + 1', difficulty: 6 }),
      () => ({ question: '(x^(2)+2x)/(4x^(2)-1) · (1/(x+2) : x - (x^(2)/(x+2) - x + 2)) = ?', answer: '(1-4x)/(4x^(2)-1)', difficulty: 6 }),
      () => ({ question: '(a^(2)/(a^(2)-b^(2)) - (a^(2)b/(a^(2)+b^(2)))·(a/(ab+b^(2)) + b/(a^(2)+ab))) : (b^(2)/(a^(2)-b^(2))) = ?', answer: 'a/b', difficulty: 6 }),
    ],
    /* Тир 7: телескопическая сумма и сложное выражение в степени −1 */ [
      () => { const n = int(r, 3, 6); const terms = Array.from({ length: n }, (_, i) => `1/((x+${i})(x+${i+1}))`).join(' + '); return { question: terms + ' = ?', answer: `${n}/(x(x+${n}))`, difficulty: 7, acceptedAnswers: [`${n}/(x^(2)+${n}x)`] }; },
      () => { const d = int(r, 3, 6); const num = d * d; return { question: `((a-${d})/a - a + ${d - 1}) · (1/(a+2) - (a+2)/(a^(2)-${2 * d}a+${d * d})) - a/${2 * d})^(-1) = ?`, answer: `${2 * d}(a+2)/(${num * 4}-a^(2)-${2 * d}a)`, difficulty: 7 }; },
      () => { const n = int(r, 2, 5); const den = Array.from({ length: n + 1 }, (_, i) => `(x+${i})(x+${i+1})`).join(' + '); const ansNum = n; const ansDen = `x(x+${n+1})`; return { question: `1/(x(x+1)) + 1/((x+1)(x+2)) + ... + 1/((x+${n})(x+${n+1})) = ?`, answer: `${ansNum}/(${ansDen})`, difficulty: 7 }; },
      () => { const base = int(r, 2, 6), exp = int(r, 1, 4); const val = Math.pow(base, exp); return { question: `log[${base}](${val})`, answer: String(exp), difficulty: 7 }; },
    ],
  ];

  const equations = (): Record<SkillKey, Array<Array<() => TemplateQuestion>>>['equations'] => [
    /* Тир 1: x/a+b=c, ax+b=c, ax=c, x²=k, системы */ [
      () => { const a = int(r, 2, 9), b = int(r, 1, 10), c = int(r, b + 2, 18); const x = (c - b) * a; return { question: `frac{x}{${a}} + ${b} = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { const a = int(r, 2, 9), b = int(r, 2, 12); const c = a * b; return { question: `${a}x = ${c}`, answer: String(b), difficulty: 1 }; },
      () => { const k = int(r, 5, 25), right = int(r, 10, 30); const x = k + right; return { question: `x - ${k} = ${right}`, answer: String(x), difficulty: 1 }; },
      () => { const x = int(r, 3, 12), a = int(r, 2, 5), b = int(r, 1, 8); const c = a * x + b; return { question: `${a}x + ${b} = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { const a = int(r, 2, 8), x = int(r, 2, 15), b = int(r, 1, 15); const c = a * x + b; return { question: `${a}x + ${b} = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { const k = [4, 9, 16, 25, 36, 49][int(r, 0, 5)]!; const root = Math.sqrt(k); return { question: `x^(2) = ${k}`, answer: `${root},${-root}`, difficulty: 1 }; },
      () => { const x = int(r, 4, 14), d = int(r, 1, Math.min(8, x - 1)), a = int(r, 2, 5); const c = a * (x - d); return { question: `${a} * (x - ${d}) = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { const k = [9, 16, 25, 36, 49][int(r, 0, 4)]!; const add = int(r, 4, 20); const rhs = k + add; const root = Math.sqrt(k); return { question: `x^(2) + ${add} = ${rhs}`, answer: `${root},${-root}`, difficulty: 1 }; },
      () => { const a = int(r, 2, 6), x = int(r, 2, 10), b = int(r, 2, 12), d = int(r, 1, 15); const right = a * x + b; const c = right + d; return { question: `${a}x + ${b} = ${c} - ${d}`, answer: String(x), difficulty: 1 }; },
      () => { const x = int(r, 4, 14), d = int(r, 1, Math.min(8, x - 1)), a = int(r, 2, 5); const c = a * (x - d); return { question: `${a} * (x - ${d}) = ${c}`, answer: String(x), difficulty: 1 }; },
      () => { let r1 = int(r, -4, 4), r2 = int(r, -4, 4); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -(r1 + r2), c = r1 * r2; const bPart = b === 0 ? '' : b === 1 ? ' + x' : b === -1 ? ' - x' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((a, b) => a - b).join(','), difficulty: 1 }; },
      () => { const x = int(r, 3, 12), y = int(r, 2, 10); const sum = x + y, diff = x - y; return { question: `system{x+y=${sum}; x-y=${diff}}`, answer: `x=${x},y=${y}`, difficulty: 1 }; },
    ],
    /* Тир 2: квадратные, системы, ax+b=cx+d, x²+k=… (без простых ax+b=c и x/a+b=c) */ [
      () => { const a = int(r, 2, 5); let r1 = int(r, -4, 4), r2 = int(r, -4, 4); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -a * (r1 + r2), c = a * r1 * r2; const bPart = b === 0 ? '' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `${a}x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((u, v) => u - v).join(','), difficulty: 2 }; },
      () => { const x = int(r, 3, 10), y = int(r, 2, 8), m = int(r, 1, 5), n = int(r, 1, 5); const c1 = m * x + n * y, c2 = m * x - n * y; return { question: `system{${m}x+${n}y=${c1}; ${m}x-${n}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 2 }; },
      () => { const k = [9, 16, 25, 36, 49, 64][int(r, 0, 5)]!; const add = int(r, 5, 25); const rhs = k + add; const root = Math.sqrt(k); return { question: `x^(2) + ${add} = ${rhs}`, answer: `${root},${-root}`, difficulty: 2 }; },
      () => { const x = int(r, 4, 15), y = int(r, 2, 10); const sum = x + y, diff = x - y; return { question: `system{x+y=${sum}; x-y=${diff}}`, answer: `x=${x},y=${y}`, difficulty: 2 }; },
      () => { const x = int(r, 5, 18), d = int(r, 2, Math.min(9, x - 1)), a = int(r, 2, 6); const c = a * (x - d); return { question: `${a} * (x - ${d}) = ${c}`, answer: String(x), difficulty: 2 }; },
      () => { const x = int(r, 2, 10), a = int(r, 2, 6), c = int(r, 2, 6); const c2 = a === c ? (c % 6) + 2 : c; const b = int(r, 1, 10), d = b + x * (a - c2); return { question: `${a}x + ${b} = ${c2}x + ${d}`, answer: String(x), difficulty: 2 }; },
      () => { let r1 = int(r, -5, 5), r2 = int(r, -5, 5); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -(r1 + r2), c = r1 * r2; const bPart = b === 0 ? '' : b === 1 ? ' + x' : b === -1 ? ' - x' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((a, b) => a - b).join(','), difficulty: 2 }; },
      () => { const a = int(r, 2, 5); let r1 = int(r, -5, 5), r2 = int(r, -5, 5); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -a * (r1 + r2), c = a * r1 * r2; const bPart = b === 0 ? '' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `${a}x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((u, v) => u - v).join(','), difficulty: 2 }; },
      () => { const x = int(r, 3, 12), y = int(r, 2, 9), m = int(r, 1, 6), n = int(r, 1, 6); const c1 = m * x + n * y, c2 = m * x - n * y; return { question: `system{${m}x+${n}y=${c1}; ${m}x-${n}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 2 }; },
      () => { const a = int(r, 2, 6); let r1 = int(r, -5, 5), r2 = int(r, -5, 5); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -a * (r1 + r2), c = a * r1 * r2; const bPart = b === 0 ? '' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `${a}x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((u, v) => u - v).join(','), difficulty: 2 }; },
      () => { const x = int(r, 4, 14), y = int(r, 3, 11), m = int(r, 2, 6), n = int(r, 2, 6); const c1 = m * x + n * y, c2 = m * x - n * y; return { question: `system{${m}x+${n}y=${c1}; ${m}x-${n}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 2 }; },
      () => { const k = [16, 25, 36, 49, 64, 81][int(r, 0, 5)]!; const add = int(r, 10, 30); const rhs = k + add; const root = Math.sqrt(k); return { question: `x^(2) + ${add} = ${rhs}`, answer: `${root},${-root}`, difficulty: 2 }; },
      () => { const a = int(r, 2, 6); let r1 = int(r, -6, 6), r2 = int(r, -6, 6); if (r1 === r2) r2 = r1 !== 0 ? 0 : 1; const b = -a * (r1 + r2), c = a * r1 * r2; const bPart = b === 0 ? '' : b > 0 ? ` + ${b}x` : ` - ${-b}x`; const cPart = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`; return { question: `${a}x^(2)${bPart}${cPart} = 0`, answer: [r1, r2].sort((u, v) => u - v).join(','), difficulty: 2 }; },
      () => { const x = int(r, 4, 12), y = int(r, 3, 10), m = int(r, 2, 6), n = int(r, 2, 6); const c1 = m * x + n * y, c2 = m * x - n * y; return { question: `system{${m}x+${n}y=${c1}; ${m}x-${n}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 2 }; },
      () => { const x = int(r, 3, 12), a = int(r, 2, 6), c = int(r, 2, 6); if (a === c) return { question: '2x+1=4x-3', answer: '2', difficulty: 2 }; const b = int(r, 1, 12), d = b + x * (a - c); return { question: `${a}x + ${b} = ${c}x + ${d}`, answer: String(x), difficulty: 2 }; },
    ],
    /* Тир 3: иррациональные, алгебраические, системы */ [
      () => { const a = int(r, 2, 8), b = int(r, 3, 12); const x = b * b - a; return { question: `sqrt(x + ${a}) = ${b}`, answer: String(x), difficulty: 3 }; },
      () => { const a = int(r, 2, 6), b = int(r, 4, 12); const x = b * b - a; return { question: `sqrt(x^(2) + ${a} - 2x - ${int(r, 2, 4)}·sqrt(x-1)) = ${b}`, answer: String(x + 1), difficulty: 3 }; },
      () => { const r1 = int(r, 0, 2), r2 = int(r, 1, 3), r3 = int(r, 2, 4); const sum = r1 + r2 + r3, pair = r1 * r2 + r2 * r3 + r1 * r3, prod = r1 * r2 * r3; return { question: `x(x^(2) + ${pair}) + ${-prod} = (2x + ${r1 + r2})(${r2 + r3}x + ${r1 + r3}) - x^(2)`, answer: [r1, r2, r3].sort((a, b) => a - b).join(','), difficulty: 3 }; },
      () => { const x = int(r, 1, 5), y = int(r, 1, 5); const a = int(r, 2, 5), b = int(r, 2, 5); const c1 = a * (x + y), c2 = 6 - b * (x - y); const c3 = 8 * x - 2 * y; return { question: `system{${a}(x+y)=${c1}; ${c2}-${b}(x-y)=${c3}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 2, 8), y = int(r, -3, 2); const c1 = 2 * x - 3 * (2 * y + 1), c2 = 3 * (x + y) + 3 * y; const c3 = 2 * y - 2; return { question: `system{2x-3(2y+1)=${c1}; 3(x+y)+3y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 10, 18), y = int(r, 8, 14); const c1 = 6 * y - 5 * x; const c2 = (x - 1) / 3 + (y + 1) / 2; return { question: `system{6y-5x=${c1}; frac{(x-1)}{3}+frac{(y+1)}{2}=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 4, 10), y = int(r, 4, 10); const lhs1 = (2 * x - y) / 6 + (2 * x + y) / 9; const lhs2 = (x + y) / 3 - (x - y) / 4; return { question: `system{frac{(2x-y)}{6}+frac{(2x+y)}{9}=${lhs1}; frac{(x+y)}{3}-frac{(x-y)}{4}=${lhs2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 2, 12), y = int(r, 2, 10); const sum = x + y, diff = x - y; const a = int(r, 2, 5), b = int(r, 2, 5); const c1 = a * sum, c2 = b * diff; return { question: `system{${a}(x+y)=${c1}; ${b}(x-y)=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 3, 14), y = int(r, 2, 9); const m = int(r, 2, 5), n = int(r, 2, 5); const c1 = m * x + n * y, c2 = m * x - n * y; return { question: `system{${m}x+${n}y=${c1}; ${m}x-${n}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 4, 15), y = int(r, 3, 11); const a = int(r, 2, 6), b = int(r, 2, 6); const c1 = a * x + b * y, c2 = a * x - b * y; return { question: `system{${a}x+${b}y=${c1}; ${a}x-${b}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
      () => { const x = int(r, 5, 18), y = int(r, 4, 12); const p = int(r, 2, 4), q = int(r, 2, 4); const c1 = p * x + q * y, c2 = p * x - q * y; return { question: `system{${p}x+${q}y=${c1}; ${p}x-${q}y=${c2}}`, answer: `x=${x},y=${y}`, difficulty: 3 }; },
    ],
    /* Тир 4: уравнения подстановкой и рациональные */ [
      () => { const t = int(r, 3, 6); return { question: `(x^(2)-${t})^(4) - (x^(2)-${t})^(2) = 12`, answer: `-sqrt(${t + 2}),sqrt(${t + 2}),-sqrt(${t - 2}),sqrt(${t - 2})`, difficulty: 4 }; },
      () => { const p = int(r, 3, 6); const q = int(r, 2, 5); const x1 = -p / 2 + Math.sqrt(p * p / 4 + q); const x2 = -p / 2 - Math.sqrt(p * p / 4 + q); if (!Number.isFinite(x1)) return { question: `(x^(2)+${p}x)(x^(2)+${p}x-8) - 20 = 0`, answer: '(-5-sqrt(17))/2,(-5+sqrt(17))/2', difficulty: 4 }; return { question: `(x^(2)+${p}x)(x^(2)+${p}x-${p + 2}) - ${q * q} = 0`, answer: [x1, x2].map(v => v.toFixed(2)).join(','), difficulty: 4 }; },
      () => { const a = int(r, 2, 5); const x = a; const b = a * a + 2 * a + int(r, 1, 5); return { question: `(x^(2)+${2 * a}x)/(x+${b - a * a - 2 * a}) = ${b}/(x+${b - a * a - 2 * a})`, answer: String(x), difficulty: 4 }; },
      () => { const d = int(r, 2, 6); const x = int(r, 2, 8); const den = d + 1; const rhs = x * x - d * x; return { question: `(x^(2)-${d}x)/(${den}-x) = ${rhs}/(x-${den})`, answer: String(x), difficulty: 4 }; },
      () => { const r0 = int(r, 1, 4); return { question: `(x^(2)+${r0 + 1}x-${r0 * (r0 + 2)})/(x^(2)+2x-8) = 0`, answer: String(r0), difficulty: 4 }; },
      () => { const x = int(r, -4, 0); return { question: '1 - (2x^(2)-x-6)/(2-x) = 0', answer: String(x), difficulty: 4 }; },
      () => { const a = int(r, 2, 6), b = int(r, 2, 8); const x = b * b - a; if (x < 0) return { question: `sqrt(x + ${a + 1}) = ${b}`, answer: String(b * b - a - 1), difficulty: 4 }; return { question: `sqrt(x + ${a}) = ${b}`, answer: String(x), difficulty: 4 }; },
      () => { const c = int(r, 5, 20), d = int(r, 2, 6); const x = c + d * d; return { question: `sqrt(x - ${c}) = ${d}`, answer: String(x), difficulty: 4 }; },
      () => { const c = int(r, 2, 5), b = c * c, a = int(r, 2, 6); const rhs = a * c + b; return { question: `(x^(2)+${a}x)/(x+${b}) = ${rhs}/(x+${b})`, answer: String(c), difficulty: 4 }; },
      () => { const s = int(r, 3, 10), p = int(r, 2, 8); const x = int(r, 1, s - 1); const q = s - x; if (x * q !== p) return { question: '(x^(2)+2x)/(x+4) = 8/(x+4)', answer: '2', difficulty: 4 }; return { question: `(x^(2)-${s}x+${p})/(x-${x}) = 0`, answer: `${q}`, difficulty: 4 }; },
    ],
    /* Тир 5: двойное неравенство, рациональные и квадратные неравенства */ [
      () => { const a = int(r, 3, 6), b = int(r, 20, 30); return { question: `${b - a} - x < x^(2) ≤ ${b}`, answer: `[-${Math.floor(Math.sqrt(b))},-${Math.floor(Math.sqrt(b)) - 1})∪(${a},${Math.floor(Math.sqrt(b))}]`, difficulty: 5, acceptedAnswers: [`${Math.floor(Math.sqrt(b))}≤x<-${Math.floor(Math.sqrt(b)) - 1} or ${a}<x≤${Math.floor(Math.sqrt(b))}`] }; },
      () => { const k1 = int(r, 2, 6), k2 = int(r, 1, 4); return { question: `${k1}/(x+1) + ${k2}/(1-x) < 1`, answer: '(-∞,-1)∪(1,∞)', difficulty: 5, acceptedAnswers: ['x<-1 or x>1'] }; },
      () => { const a = int(r, 2, 5), b = int(r, 3, 8); return { question: `(${a}x^(2)+20x+26)/(x^(2)+6x+5) < 2`, answer: '(-5,-4)∪(-4,-1)', difficulty: 5 }; },
      () => { const a = int(r, 1, 5), b = int(r, 2, 8); const c = a * b; return { question: `${c}x + x^(2) < 0`, answer: `(-${c},0)`, difficulty: 5, acceptedAnswers: [`-${c}<x<0`] }; },
      () => { const k = int(r, 2, 6); const r0 = Math.sqrt(k); if (r0 !== Math.floor(r0)) return { question: '4x^(2) ≥ 49', answer: '(-∞,-7/2]∪[7/2,∞)', difficulty: 5, acceptedAnswers: ['x≤-7/2 or x≥7/2'] }; return { question: `${k}x^(2) ≥ ${k * k}`, answer: `(-∞,-${k}]∪[${k},∞)`, difficulty: 5, acceptedAnswers: [`x≤-${k} or x≥${k}`] }; },
      () => { const r0 = int(r, 3, 8); return { question: `x^(2) - ${2 * r0}x + ${r0 * r0} ≤ 0`, answer: String(r0), difficulty: 5 }; },
      () => { const a = int(r, 5, 12), b = int(r, 1, 5), c = int(r, 10, 20); const disc = b * b - 4 * a * c; if (disc >= 0) return { question: `${a}x^(2) - ${b}x + ${c} > 0`, answer: 'R', difficulty: 5, acceptedAnswers: ['(-∞,∞)'] }; return { question: `${a}x^(2) - ${b}x + ${c} > 0`, answer: 'R', difficulty: 5, acceptedAnswers: ['(-∞,∞)', 'все x'] }; },
      () => { const r1 = int(r, -4, 0), r2 = int(r, 1, 5); if (r1 >= r2) return { question: '3x^(2) - x - 4 > 0', answer: '(-∞,-1)∪(4/3,∞)', difficulty: 5 }; const a = int(r, 1, 3), b = -a * (r1 + r2), c = a * r1 * r2; return { question: `${a}x^(2) + ${b}x + ${c} > 0`, answer: `(-∞,${r1})∪(${r2},∞)`, difficulty: 5, acceptedAnswers: [`x<${r1} or x>${r2}`] }; },
      () => { const p = int(r, 1, 4); return { question: `x^(2) + 0.${p}x + 0.${p - 1} < 0`, answer: '∅', difficulty: 5, acceptedAnswers: ['нет решений', 'пустое множество'] }; },
      () => { const d = int(r, 2, 6); return { question: `system{x^(2)-${2 * d}x+${d * d - 1}≥0; (x+4)(x+2)/(x-1)≤0}`, answer: '(-∞,-4]∪[-2,1)', difficulty: 5, acceptedAnswers: ['x≤-4 or -2≤x<1'] }; },
      () => { const k = int(r, 2, 4); return { question: `system{${k}x-x^(2)-1<0; 3-2x≥0}`, answer: '(-∞,1)∪(1,3/2]', difficulty: 5, acceptedAnswers: ['x<1 or 1<x≤3/2'] }; },
      () => { const m = int(r, 15, 25); return { question: `system{x(x-1)≤${m}; x-4<-4-x}`, answer: '[-4,0)', difficulty: 5, acceptedAnswers: ['-4≤x<0'] }; },
      () => { const a = int(r, 3, 5), b = int(r, 4, 6); return { question: `system{(1+x)^(2)≥${a * a}; (2x-7)^(2)<${b}}`, answer: `[${a - 1},5)`, difficulty: 5, acceptedAnswers: [`${a - 1}≤x<5`] }; },
      () => { const a = int(r, 1, 5), b = int(r, 2, 8); const c = a * b; return { question: `${c}x + x^(2) < 0`, answer: `(-${c},0)`, difficulty: 5, acceptedAnswers: [`-${c}<x<0`] }; },
      () => { const k = int(r, 2, 6); const r0 = Math.sqrt(k); if (r0 !== Math.floor(r0)) return { question: '4x^(2) ≥ 49', answer: '(-∞,-7/2]∪[7/2,∞)', difficulty: 5, acceptedAnswers: ['x≤-7/2 or x≥7/2'] }; return { question: `${k}x^(2) ≥ ${k*k}`, answer: `(-∞,-${k}]∪[${k},∞)`, difficulty: 5, acceptedAnswers: [`x≤-${k} or x≥${k}`] }; },
      () => { const r1 = int(r, -4, 0), r2 = int(r, 1, 5); if (r1 >= r2) return { question: '3x^(2) - x - 4 > 0', answer: '(-∞,-1)∪(4/3,∞)', difficulty: 5 }; const a = int(r, 1, 3), b = -a * (r1 + r2), c = a * r1 * r2; return { question: `${a}x^(2) + ${b}x + ${c} > 0`, answer: `(-∞,${r1})∪(${r2},∞)`, difficulty: 5, acceptedAnswers: [`x<${r1} or x>${r2}`] }; },
    ],
    /* Тир 6: рациональные и иррациональные уравнения, системы */ [
      () => { const r1 = int(r, 1, 3), r2 = int(r, 4, 7); const sum = r1 + r2; const prod = r1 * r2; return { question: `(x^(2)-${sum}x+${prod})/(x-${r1}) = ${r2}`, answer: `${r1},${r2}`, difficulty: 6 }; },
      () => { const d = int(r, 2, 5); const x = int(r, 0, 3); const num = x * x + x - 2; const den = x + 2; return { question: `(x^(2)+x-2)/(x+2) = x - 1`, answer: '0', difficulty: 6 }; },
      () => { const a = int(r, 2, 5), b = int(r, 2, 6); const sq = a * a + b; const root = Math.sqrt(sq); if (root !== Math.floor(root)) return { question: `sqrt(x^(2)-${b}) = ${a}`, answer: `${Math.floor(root)},${-Math.floor(root)}`, difficulty: 6 }; return { question: `sqrt(x^(2)-${b}) = ${a}`, answer: `${root},${-root}`, difficulty: 6 }; },
      () => { const x = int(r, 1, 4); const rhs = Math.sqrt(2 * x + 1) + Math.sqrt(x); return { question: `sqrt(2x+1) + sqrt(x) = ${Math.round(rhs * 100) / 100}`, answer: String(x), difficulty: 6 }; },
      () => { const rad = int(r, 4, 6); const R2 = rad * rad; const s = int(r, 3, 6); const y1 = int(r, 1, Math.min(s - 1, Math.floor(Math.sqrt(R2)))); const x1 = s - y1; if (x1 * x1 + y1 * y1 !== R2 || x1 < 0) return { question: 'system{x^(2)+y^(2)=25; x+y=7}', answer: 'x=3,y=4', difficulty: 6, acceptedAnswers: ['x=4,y=3'] }; return { question: `system{x^(2)+y^(2)=${R2}; x+y=${s}}`, answer: `x=${x1},y=${y1}`, difficulty: 6, acceptedAnswers: [`x=${y1},y=${x1}`] }; },
      () => { const p = int(r, 2, 5), q = int(r, 2, 5); return { question: `system{${p}/x+${q}/y=${p + q + 1}; 1/x-1/y=0}`, answer: 'x=1,y=1', difficulty: 6 }; },
      () => { const d = int(r, 2, 5); const x = d + 1; return { question: `(x^(2)-${d * d})/(x-${d}) + (x^(2)-${(d + 1) * (d + 1)})/(x+${d + 1}) = ${2 * x + 1}`, answer: String(x), difficulty: 6 }; },
      () => { const d = int(r, 2, 5); return { question: `(x^(2)-${d * d})/(x+${d}) = x - ${d}`, answer: `(-∞,-${d}) U (-${d},+∞)`, difficulty: 6, acceptedAnswers: [`(-∞,-${d})∪(-${d},+∞)`] }; },
      () => { const k = int(r, 1, 3); const x = (1 + 1 / (2 * k)) * (1 + 1 / (2 * k)) / 4; return { question: `sqrt(x+1) - sqrt(x-1) = ${k}`, answer: String(Math.round(x * 100) / 100), difficulty: 6 }; },
      () => { const a = int(r, 1, 8), b = int(r, 2, 6); const x = b * b - a; return { question: `sqrt(x + ${a}) = ${b}`, answer: String(x), difficulty: 6 }; },
      () => { const a = int(r, 3, 15), b = int(r, 2, 5); const x = a + b * b; return { question: `sqrt(x - ${a}) = ${b}`, answer: String(x), difficulty: 6 }; },
      () => { const x = int(r, 2, 10), a = int(r, 2, 6), b = int(r, 1, 8); const c = a * x + b; return { question: `frac{x}{${a}} + ${b} = ${c}`, answer: String(x), difficulty: 6 }; },
      () => { const r1 = int(r, 1, 4), r2 = int(r, 5, 9); if (r1 === r2) return { question: '(x^(2)-3x)/(x-2) = 2', answer: '1,4', difficulty: 6 }; const sum = r1 + r2, prod = r1 * r2; return { question: `(x^(2)-${sum}x+${prod})/(x-${r1}) = ${r2}`, answer: String(r2), difficulty: 6 }; },
      () => { const a = int(r, 2, 5), b = int(r, 1, 12); const sq = a * a + b; const root = Math.sqrt(sq); if (root !== Math.floor(root)) return { question: 'sqrt(x^(2)-5) = 2', answer: '3,-3', difficulty: 6 }; return { question: `sqrt(x^(2)-${b}) = ${a}`, answer: `${root},${-root}`, difficulty: 6 }; },
    ],
    /* Тир 7: показательные неравенства */ [
      () => { const b = [0.5, 0.6, 0.7, 0.8][int(r, 0, 3)]!; const exp2 = int(r, 1, 3); return { question: `(${b})^(x+4) ≥ (${(b * b).toFixed(2)})^(x^(2)+${exp2})`, answer: '(-∞,0]∪[1/2,∞)', difficulty: 7, acceptedAnswers: ['x≤0 or x≥1/2'] }; },
      () => { const a = int(r, 2, 5); return { question: `${a * a}^(x) ≥ ${a}^(4-x-x^(2))`, answer: '(-∞,-4]∪[1,∞)', difficulty: 7, acceptedAnswers: ['x≤-4 or x≥1'] }; },
      () => { const p = int(r, 2, 5), q = int(r, 2, 5); const b = p / (p + q); return { question: `(${b.toFixed(2)})^(x^(2)) ≥ (${(b * b).toFixed(2)})^(x+1.5)`, answer: '[-1,3]', difficulty: 7, acceptedAnswers: ['-1≤x≤3'] }; },
      () => { const p = int(r, 2, 4), q = int(r, 2, 4); const b = p / q; return { question: `(${b.toFixed(2)})^(x^(2)) < (${(q / p).toFixed(2)})^(5x-6)`, answer: '(-∞,-6)∪(1,∞)', difficulty: 7, acceptedAnswers: ['x<-6 or x>1'] }; },
      () => { const base = int(r, 2, 5), k = int(r, 1, 3); return { question: `${base}^(8x+${k}) > 1/${base * base}`, answer: `(-${(k - 2) / 8},∞)`, difficulty: 7, acceptedAnswers: ['x>-1/2'] }; },
      () => { const p = int(r, 2, 4), q = int(r, 3, 5); const shift = int(r, 2, 4); return { question: `(${p}/${q})^(x-${shift}) > ${q / p}`, answer: `(-∞,${shift - 1})`, difficulty: 7, acceptedAnswers: [`x<${shift - 1}`] }; },
      () => { const base = int(r, 3, 7), bound = int(r, 5, 12); return { question: `${base}^(x) ≤ ${bound}`, answer: `(-∞,log[${base}](${bound}))`, difficulty: 7, acceptedAnswers: [`x≤log[${base}](${bound})`] }; },
      () => { const a = int(r, 2, 6); const root = Math.sqrt(a); if (root !== Math.floor(root)) return { question: '(sqrt(5))^(x-6) < 1/5', answer: '(-∞,4)', difficulty: 7, acceptedAnswers: ['x<4'] }; return { question: `(sqrt(${a}))^(x-6) < 1/${a}`, answer: '(-∞,4)', difficulty: 7, acceptedAnswers: ['x<4'] }; },
      () => { const n = int(r, 2, 4); const base = Math.pow(3, 1 / n); return { question: `(root(${n})(3))^(x+1) ≥ 1/81`, answer: '[-13,∞)', difficulty: 7, acceptedAnswers: ['x≥-13'] }; },
      () => { const n = int(r, 4, 6); return { question: `(root(${n})(10))^(x-8) < 0.01`, answer: '(-∞,-2)', difficulty: 7, acceptedAnswers: ['x<-2'] }; },
      () => { const a = int(r, 2, 4), b = int(r, 1, 5), k = int(r, 1, 4); const c = b + a * k; return { question: `(1/2)^(${a}x+${b}) > (1/2)^(${c})`, answer: `(-∞,${k})`, difficulty: 7, acceptedAnswers: [`x<${k}`] }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 6); const val = Math.pow(base, exp); return { question: `${base}^(x) ≤ ${val}`, answer: `(-∞,${exp}]`, difficulty: 7, acceptedAnswers: [`x≤${exp}`] }; },
    ],
  ];

  const logarithms = (): Record<SkillKey, Array<Array<() => TemplateQuestion>>>['logarithms'] => [
    /* Тир 1: объединённые бывшие тиры 1–3 + степени с рациональным показателем */ [
      () => { const base = int(r, 2, 4), exp = int(r, 1, 3); const ans = Math.pow(base, exp); return { question: `log[${base}](${ans})`, answer: String(exp), difficulty: 1 }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 4); const ans = Math.pow(base, exp); return { question: `log[${base}](${ans})`, answer: String(exp), difficulty: 1 }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 5); const ans = Math.pow(base, exp); return { question: `log[${base}](${ans})`, answer: String(exp), difficulty: 1 }; },
      () => { const a = int(r, 2, 4), s = int(r, 3, 8); const x = s * s - a; return { question: `sqrt(x + ${a}) = ${s}`, answer: String(x), difficulty: 1 }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 5); const ans = Math.pow(base, exp); return { question: `log[${base}](${ans})`, answer: String(exp), difficulty: 1 }; },
      () => { const a = int(r, 2, 5), s = int(r, 3, 10); const x = s * s - a; return { question: `sqrt(x + ${a}) = ${s}`, answer: String(x), difficulty: 1 }; },
      () => { const a = int(r, 2, 5), s = int(r, 3, 12); const x = s * s - a; return { question: `sqrt(x + ${a}) = ${s}`, answer: String(x), difficulty: 1 }; },
      () => { const a = int(r, 2, 5), s = int(r, 3, 10), k = int(r, 1, 8); const x = s * s - a; const rhs = s + k; return { question: `sqrt(x + ${a}) + ${k} = ${rhs}`, answer: String(x), difficulty: 1, acceptedAnswers: [String(x) + '.0', String(x) + ',0'] }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 5); const ans = Math.pow(base, exp); return { question: `log[${base}](${ans})`, answer: String(exp), difficulty: 1 }; },
      /* Найди значение: a^(1/n) */ () => { const k = int(r, 2, 5), n = int(r, 2, 4); const base = Math.pow(k, n); return { question: `${base}^(1/${n})`, answer: String(k), difficulty: 1 }; },
      /* Найди значение: a^(1/2) */ () => { const k = int(r, 2, 12); const base = k * k; return { question: `${base}^(1/2)`, answer: String(k), difficulty: 1 }; },
      /* Найди значение: a^(m/n) */ () => { const k = int(r, 2, 4), n = int(r, 2, 4), m = int(r, 1, n - 1); const base = Math.pow(k, n); const ansVal = Math.pow(k, m); return { question: `${base}^(${m}/${n})`, answer: String(ansVal), difficulty: 1 }; },
      /* Найди значение: a^(-1/n) */ () => { const k = int(r, 2, 5), n = int(r, 2, 4); const base = Math.pow(k, n); return { question: `${base}^(-1/${n})`, answer: `1/${k}`, difficulty: 1 }; },
      /* Найди значение: a^(-m/n) */ () => { const k = int(r, 2, 4), n = int(r, 2, 5), m = int(r, 1, n - 1); const base = Math.pow(k, n); const ansVal = Math.pow(k, m); return { question: `${base}^(-${m}/${n})`, answer: `1/${ansVal}`, difficulty: 1 }; },
    ],
    /* Тир 2: упрощение степеней, числовые степени, корни */ [
      () => { const n1 = int(r, 2, 5), n2 = int(r, 2, 5); const num = n1 + n2; const den = n1 * n2; return { question: `a^(1/${n1}) * a^(1/${n2})`, answer: `a^(${num}/${den})`, difficulty: 2 }; },
      () => { const d1 = int(r, 4, 8), d2 = int(r, 6, 12), d3 = int(r, 6, 12); const lcm = d1 * d2 * d3; const exp = lcm / d1 + lcm / d2 + lcm / d3; const g = (a: number, b: number) => b ? g(b, a % b) : a; const gcd = g(exp, lcm); return { question: `x^(1/${d1}) * x^(1/${d2}) * x^(1/${d3})`, answer: `x^(${exp / gcd}/${lcm / gcd})`, difficulty: 2 }; },
      () => { const p1 = int(r, 1, 4), q1 = int(r, 2, 6), p2 = int(r, 2, 5), q2 = int(r, 2, 6), p3 = int(r, 2, 4), q3 = int(r, 2, 5); const d = 36; const exp = (p1 / q1 + p2 / q2 - p3 / q3) * d; return { question: `c^(${p1}/${q1}) * c^(${p2}/${q2}) : c^(${p3}/${q3})`, answer: exp >= 0 ? `c^(${exp}/${d})` : `c^(-${-exp}/${d})`, difficulty: 2 }; },
      () => { const p = int(r, 2, 5), q = int(r, 4, 8); const exp = (p / q) * int(r, 1, 2) + 1; return { question: `(y^(${p}/${q}))^0.${int(r, 5, 9)} * y`, answer: `y^(${Math.round(exp * 10) / 10})`, difficulty: 2 }; },
      () => { const a = int(r, -1, 1) || -0.3; const n = int(r, 1, 2); return { question: `(b^(${a}))^(1 ${n}/3) : b^2`, answer: 'b^(-5/2)', difficulty: 2 }; },
      () => { const k = int(r, 2, 4); return { question: `b^(-${k}.5) : b^(${k + 1}.5) * (1/b^4)^(-8)`, answer: 'b^26', difficulty: 2 }; },
      () => { const m = int(r, -6, -2), n = int(r, -3, -1); const prod = Math.pow(-1, m) * Math.pow(-2, n); return { question: `(-1)^(${m}) * (-2)^(${n})`, answer: prod === 0.25 ? '1/4' : prod === -0.25 ? '-1/4' : String(prod), difficulty: 2, acceptedAnswers: prod === -0.25 ? ['-0.25'] : undefined }; },
      () => { const base = int(r, 2, 5); const exp = int(r, 2, 4); const num = Math.pow(base, exp); return { question: `${num}^(-1) : (1/${base})^${exp + 1}`, answer: String(base), difficulty: 2 }; },
      () => { const d = int(r, 2, 5); const val = Math.pow(10, -d); return { question: `(${val}^(-1))^3 - 0.11^0`, answer: String(Math.round(Math.pow(10, d) * Math.pow(10, d) * Math.pow(10, d)) - 1), difficulty: 2 }; },
      () => { const k = int(r, 2, 4); const big = 3 * k * k * k; const small = 3; return { question: `cbrt(${big}) - cbrt(${small})`, answer: `${k - 1}*cbrt(3)`, difficulty: 2, acceptedAnswers: [`${k - 1}*³√3`] }; },
      () => { const n = int(r, 4, 6); const base = int(r, 2, 4); const a = Math.pow(base, n); const b = Math.pow(base, n - 1); return { question: `${n}*root(${n})(${a * 2}) - 2*root(${n})(${b * 2})`, answer: `${int(r, 2, 4)}*root(${n})(${base}) - ${int(r, 2, 4)}`, difficulty: 2 }; },
      () => { const k = int(r, 2, 5); const small = k * k; const big = small * small * small; return { question: `(cbrt(${small}) - cbrt(${big})) * cbrt(${k})`, answer: String(-k * (k - 1)), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 2, 5), q = int(r, 2, 5); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) + log[${base}](${b})`, answer: String(p + q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 2, 5), q = int(r, 2, 5); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base * base - 1}](${a}) + log[${base * base - 1}](${b})`, answer: String(p + q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 2, 4), q = int(r, 2, 4); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[10](${a}) + log[10](${b})`, answer: String(p + q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 2, 5); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) + log[${base}](${b})`, answer: String(p + q), difficulty: 2 }; },
      () => { const bases = [4, 6, 8, 9]; const base = bases[int(r, 0, 3)]!; const a = base === 9 ? 3 : 2; const b = base / a; return { question: `log[(1/${base})](${a}) + log[(1/${base})](${b})`, answer: '-1', difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 1, p - 1); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) - log[${base}](${b})`, answer: String(p - q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 1, p - 1); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) - log[${base}](${b})`, answer: String(p - q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 1, p - 1); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base * base}](${a * 2}) - log[${base * base}](${b * 2})`, answer: String(p - q), difficulty: 2 }; },
      () => { const base = int(r, 2, 5), p = int(r, 2, 4); const arg = Math.pow(base, p); return { question: `log[sqrt(${base})](${arg})`, answer: String(p * 2), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 2, 5), q = int(r, 2, 5); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) + log[${base}](${b})`, answer: String(p + q), difficulty: 2 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 1, p - 1); const a = Math.pow(base, p), b = Math.pow(base, q); return { question: `log[${base}](${a}) - log[${base}](${b})`, answer: String(p - q), difficulty: 2 }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 5); const val = Math.pow(base, exp); return { question: `log[${base}](${val})`, answer: String(exp), difficulty: 2 }; },
      () => { const b = int(r, 2, 8), n = int(r, 2, 5); const arg = Math.pow(b, n); return { question: `log[${b}](${arg})`, answer: String(n), difficulty: 2 }; },
    ],
    /* Тир 3: сократите дробь + степени с иррациональным показателем */ [
      /* Сократите дробь */ () => ({ question: '(a - 36) / (a^(1/2) + 6)', answer: 'a^(1/2) - 6', difficulty: 3, acceptedAnswers: ['sqrt(a) - 6'] }),
      () => ({ question: '(a^(1/14) - b^(1/14)) / (a^(1/7) - b^(1/7))', answer: 'a^(1/14) + b^(1/14)', difficulty: 3 }),
      () => ({ question: '(a + 2a^(1/2)b^(1/2) + b) / (a*b^(1/2) + a^(1/2)*b)', answer: '(a^(1/2) + b^(1/2)) / (a^(1/2)*b^(1/2))', difficulty: 3, acceptedAnswers: ['1/b^(1/2) + 1/a^(1/2)'] }),
      () => ({ question: '(a^(1/3) - 25) / (a^(1/3) + 10a^(1/6) + 25)', answer: '(a^(1/6) - 5) / (a^(1/6) + 5)', difficulty: 3 }),
      () => ({ question: '(a^(1/3) - 2a^(1/6)b^(1/6) + b^(1/3)) / (a^(2/3) - a^(1/3)b^(1/3))', answer: '(a^(1/6) - b^(1/6)) / (a^(1/3)(a^(1/6) + b^(1/6)))', difficulty: 3 }),
      () => ({ question: '(16b^(1/8) - a^(1/8)) / (a^(1/8) - 8a^(1/16)b^(1/16) + 16b^(1/8))', answer: '-(a^(1/16) + 4b^(1/16)) / (a^(1/16) - 4b^(1/16))', difficulty: 3 }),
      /* Степени с иррациональным показателем */ () => ({ question: 'a^sqrt(2) * a^(1 - sqrt(2))', answer: 'a', difficulty: 3 }),
      () => ({ question: 'x^(2*sqrt(3)) : x^sqrt(12)', answer: '1', difficulty: 3 }),
      () => ({ question: '(c^sqrt(3))^sqrt(3)', answer: 'c^3', difficulty: 3 }),
      () => ({ question: 'a^(2 + sqrt(2)) : a^(1 + sqrt(2))', answer: 'a', difficulty: 3 }),
      /* Найди значение выражения (логарифмы) */ () => ({ question: 'log[3](135) - log[3](20) + log[3](36)', answer: '5', difficulty: 3 }),
      () => ({ question: 'log[3](45) - log[3](5) + 9^(log[3](5))', answer: '27', difficulty: 3 }),
      () => ({ question: 'log[7](log[3](81)) - log[7](28)', answer: '-1', difficulty: 3 }),
      () => ({ question: 'log[10](250) + log[10](20) - log[10](5)', answer: '3', difficulty: 3 }),
      () => ({ question: 'sqrt(log[16](4) + log[16](24) - log[16](6))', answer: '1', difficulty: 3 }),
      () => ({ question: 'log[2](sqrt(5) - 1) + log[2](sqrt(5) + 1)', answer: '2', difficulty: 3 }),
      () => { const base = int(r, 2, 6), p = int(r, 2, 5), q = int(r, 2, 5); const A = Math.pow(base, p), B = Math.pow(base, q); return { question: `log[${base}](${A}) + log[${base}](${B})`, answer: String(p + q), difficulty: 3 }; },
      () => { const base = int(r, 2, 6), p = int(r, 3, 6), q = int(r, 1, p - 1); const A = Math.pow(base, p), B = Math.pow(base, q); return { question: `log[${base}](${A}) - log[${base}](${B})`, answer: String(p - q), difficulty: 3 }; },
      () => { const base = int(r, 2, 5), exp = int(r, 2, 5); const val = Math.pow(base, exp); return { question: `log[${base}](${val})`, answer: String(exp), difficulty: 3 }; },
      () => { const base = int(r, 2, 8), n = int(r, 2, 4); const arg = Math.pow(base, n); return { question: `log[${base}](${arg})`, answer: String(n), difficulty: 3 }; },
    ],
    /* Тир 4: упростить (переменные) + числовые степени + b^(log_b x)=x */ [
      () => { const k = int(r, 2, 5); return { question: `(a^(1/2) - ${k}b^(1/2)) * (a^(1/2) + ${k}b^(1/2)) - a`, answer: `-${k * k}b`, difficulty: 4 }; },
      () => { const k = int(r, 2, 5); return { question: `(${k}a^(1/4) + a^(3/4))^2 - ${2 * k}a`, answer: 'a^(1/2)*(9 + a)', difficulty: 4, acceptedAnswers: ['9*a^(1/2) + a^(3/2)', 'sqrt(a)*(9 + a)'] }; },
      () => { const d = int(r, 2, 4); const p = Math.pow(10, -d); return { question: `100^(1/2) + (${p})^(-2/3)`, answer: String(10 + Math.round(Math.pow(p, -2 / 3))), difficulty: 4 }; },
      () => { const a = int(r, 4, 6), b = int(r, 2, 4); const num = Math.sqrt(a * a) - Math.pow(b * b * b, 2 / 3); const den = Math.pow(0.0081, -3 / 4); return { question: `(${a * a}^(1/2) - ${b * b * b * b}^(2/3)) / 0.0081^(-3/4)`, answer: String(Math.round(num / den * 1000) / 1000), difficulty: 4, acceptedAnswers: [String(num / den)] }; },
      () => { const k = int(r, 2, 5); return { question: `64^(2/3) - (25^0.5) / (0.0016^0.25) + 13^0 - (1/${k})^(-2)`, answer: String(16 - 5 / 0.2 + 1 - k * k), difficulty: 4 }; },
      () => { const base = int(r, 2, 8), val = int(r, 2, 12); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 4 }; },
      () => { const base = int(r, 2, 10); const val = base === 17 ? 'sqrt(2)' : String(int(r, 2, 15)); return { question: `${base}^(log[${base}](${val}))`, answer: val, difficulty: 4, acceptedAnswers: val === 'sqrt(2)' ? ['√2'] : undefined }; },
      () => { const base = int(r, 5, 12), val = int(r, 2, 10); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 4 }; },
      () => { const p = int(r, 2, 5), q = int(r, 2, 5); const b = p / q; return { question: `(${p}/${q})^(log[${b}](${q}))`, answer: String(q), difficulty: 4 }; },
      () => { const base = int(r, 2, 10), val = int(r, 2, 15); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 4 }; },
      () => { const base = int(r, 2, 8), exp = int(r, 1, 4); const val = Math.pow(base, exp); return { question: `log[${base}](${val})`, answer: String(exp), difficulty: 4 }; },
    ],
    /* Тир 5: упростить выражение (√7) + логарифмы с тригонометрией + вычислите логарифмы */ [
      () => { const t = int(r, 3, 11); return { question: `((a^(sqrt(${t})/2) - b^(sqrt(${t})/2)) / (a^(sqrt(${t})/4)*b + b^(sqrt(${t})/4)) + (b^(sqrt(${t})/2) - 1) / (b^(sqrt(${t})/4) + a^(sqrt(${t})/4))) : ((a^(sqrt(${t})/4) + b^(sqrt(${t})/4)) / a^(-sqrt(${t})/2))^(-1)`, answer: `a^(sqrt(${t})/2)*((a^(sqrt(${t})/2) - b^(sqrt(${t})/2))/b + b^(sqrt(${t})/2) - 1)`, difficulty: 5 }; },
      () => { const base = int(r, 2, 4); return { question: `log[(1/${base})](log[3](cos(π/6)) - log[3](sin(π/6)))`, answer: '1', difficulty: 5 }; },
      () => { const a = int(r, 25, 35), b = 90 - a; return { question: `log[10](tan(${a}°)) + log[10](tan(${b}°))`, answer: '0', difficulty: 5 }; },
      () => { const k = int(r, 2, 4); return { question: `log[${k}](tan(π/12)) + log[${k}](2*cos²(π/12))`, answer: '1', difficulty: 5 }; },
      () => { const base = int(r, 2, 5); return { question: `log[${base}](sin(π/8)) + log[${base}](cos(π/8))`, answer: '-1/2', difficulty: 5, acceptedAnswers: ['-0.5'] }; },
      () => { const base = int(r, 3, 8); return { question: `log[${base}](2*tan(π/8)) - log[${base}](1 - tan²(π/8))`, answer: '1', difficulty: 5 }; },
      () => { const base = int(r, 2, 6); return { question: `log[${base}](cot(3π/8)) - log[${base}](sin²(3π/8))`, answer: '1', difficulty: 5 }; },
      () => { const base = int(r, 2, 5); const exp = int(r, 2, 5); const num = Math.pow(base, exp); return { question: `log[${num}](${base})`, answer: `1/${exp}`, difficulty: 5 }; },
      () => { const b = int(r, 2, 5); const base = 1 / (b * b); return { question: `log[${base}](${b})`, answer: '-1/2', difficulty: 5, acceptedAnswers: ['-0.5'] }; },
      () => { const a = int(r, 2, 6); const base = Math.sqrt(a); return { question: `log[sqrt(${a})](${a})`, answer: '2', difficulty: 5 }; },
      () => { const a = int(r, 3, 12); const base = Math.sqrt(a); return { question: `log[sqrt(${a})](${a * a})`, answer: '4', difficulty: 5 }; },
      () => { const p = int(r, 2, 4), q = int(r, 2, 4); const base = p * p * q; return { question: `log[${base}*sqrt(${q})](${p})`, answer: '2/5', difficulty: 5 }; },
      () => { const n = int(r, 6, 10); const base = Math.pow(36, 1 / n); return { question: `log[root(${n})(36)](6)`, answer: `${n}/2`, difficulty: 5 }; },
      () => { const k = int(r, 2, 5); const base = k * k * k; return { question: `(log[${base}*sqrt(${k})](${k}))^2`, answer: '4/9', difficulty: 5 }; },
      () => { const k = int(r, 2, 5); const base = k * k * k * k * k; return { question: `(log[${base}*sqrt(${k})](${k}))^3`, answer: '8/125', difficulty: 5 }; },
      () => { const b = int(r, 2, 8), n = int(r, 2, 5); const arg = Math.pow(b, n); return { question: `log[${b}](${arg})`, answer: String(n), difficulty: 5 }; },
      () => { const base = int(r, 2, 6), val = int(r, 2, 12); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 5 }; },
    ],
    /* Тир 6: сократите дробь + найди значение (логарифмы) */ [
      () => { const t1 = int(r, 3, 7), t2 = int(r, 5, 11); return { question: `(b^(2*sqrt(${t1})) - c^(2*sqrt(${t2}))) / (b^sqrt(${t1}) - c^sqrt(${t2}))`, answer: `b^sqrt(${t1}) + c^sqrt(${t2})`, difficulty: 6 }; },
      () => { const t1 = int(r, 2, 5), t2 = int(r, 2, 5); return { question: `(a^(2*sqrt(${t1})) + 2*a^sqrt(${t1})*b^sqrt(${t2}) + b^(2*sqrt(${t2}))) / (a^(2*sqrt(${t1})) - b^(2*sqrt(${t2})))`, answer: `(a^sqrt(${t1}) + b^sqrt(${t2})) / (a^sqrt(${t1}) - b^sqrt(${t2}))`, difficulty: 6 }; },
      () => { const base = int(r, 3, 7); const k = int(r, 2, 4); return { question: `(1/2)*log[${base}](${base - 1}) + 1/log[sqrt(${base * (base + 1)})](${base}) - (1/3)*log[${base}](27/25)`, answer: '7/6', difficulty: 6, acceptedAnswers: ['1.167'] }; },
      () => { const base = int(r, 2, 5); const p = int(r, 2, 4); return { question: `(3*log[${base}](${base * base * 5})^2 - 2*log[${base}](${base * base * 5})*log[${base}](5) - log[${base}](5)^2) / (3*log[${base}](${base * base * 5}) + log[${base}](5))`, answer: '2', difficulty: 6 }; },
      () => { const base = int(r, 2, 6), p = int(r, 2, 5), q = int(r, 2, 5); const A = Math.pow(base, p), B = Math.pow(base, q); return { question: `log[${base}](${A}) + log[${base}](${B})`, answer: String(p + q), difficulty: 6 }; },
      () => { const base = int(r, 2, 8), n = int(r, 2, 5); const val = Math.pow(base, n); return { question: `log[${base}](${val})`, answer: String(n), difficulty: 6 }; },
    ],
    /* Тир 7: сложное выражение (sqrt(2)) + логарифмы */ [
      () => { const t = int(r, 2, 5); return { question: `((n^(sqrt(${t})/4) - m^(sqrt(${t})/4)) / m^(-0.5*sqrt(${t})))^(-1) : ((m^(sqrt(${t})/2) - n^(sqrt(${t})/2)) / (m^(sqrt(${t})/4) - n^(sqrt(${t})/4) + 1) - (n^(sqrt(${t})/2) - 1) / (n^(sqrt(${t})/4) - m^(sqrt(${t})/4)))`, answer: `1 / ((n^(sqrt(${t})/4) - m^(sqrt(${t})/4)) * m^(sqrt(${t})/2) * ((m^(sqrt(${t})/2) - n^(sqrt(${t})/2))/(m^(sqrt(${t})/4) - n^(sqrt(${t})/4) + 1) - (n^(sqrt(${t})/2) - 1)/(n^(sqrt(${t})/4) - m^(sqrt(${t})/4))))`, difficulty: 7 }; },
      () => { const k = int(r, 2, 5); return { question: `${k}*log[2](32/(sqrt(5)+sqrt(6))) + log[2](11 + 2*sqrt(30))`, answer: String(5 * k), difficulty: 7 }; },
      () => { const base = int(r, 2, 5); const val = int(r, 15, 25); return { question: `((1 - log[2](5)^2)*log[10](2) + log[2](5)) * ${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 7 }; },
      () => { const base = int(r, 2, 6), exp = int(r, 2, 5); const val = Math.pow(base, exp); return { question: `log[${base}](${val})`, answer: String(exp), difficulty: 7 }; },
      () => { const base = int(r, 2, 8), val = int(r, 2, 15); return { question: `${base}^(log[${base}](${val}))`, answer: String(val), difficulty: 7 }; },
    ],
  ];

  const trigBasic: Array<{ angle: number; fn: string; ans: string; dec?: string }> = [
    { angle: 0, fn: 'sin', ans: '0' }, { angle: 0, fn: 'cos', ans: '1' }, { angle: 90, fn: 'sin', ans: '1' }, { angle: 90, fn: 'cos', ans: '0' },
    { angle: 30, fn: 'sin', ans: '0.5' }, { angle: 60, fn: 'cos', ans: '0.5' }, { angle: 45, fn: 'tan', ans: '1' }, { angle: 180, fn: 'sin', ans: '0' }, { angle: 180, fn: 'cos', ans: '-1' },
  ];
  const trigTable: Array<{ angle: number; fn: string; ans: string; dec: string }> = [
    { angle: 30, fn: 'sin', ans: '1/2', dec: '0.5' }, { angle: 30, fn: 'cos', ans: 'sqrt(3)/2', dec: '0.866' }, { angle: 30, fn: 'tan', ans: 'sqrt(3)/3', dec: '0.577' },
    { angle: 45, fn: 'sin', ans: 'sqrt(2)/2', dec: '0.707' }, { angle: 45, fn: 'cos', ans: 'sqrt(2)/2', dec: '0.707' },
    { angle: 60, fn: 'sin', ans: 'sqrt(3)/2', dec: '0.866' }, { angle: 60, fn: 'cos', ans: 'sqrt(3)/2', dec: '0.866' }, { angle: 60, fn: 'tan', ans: 'sqrt(3)', dec: '1.732' },
  ];
  const trigonometry = (): Record<SkillKey, Array<Array<() => TemplateQuestion>>>['trigonometry'] => [
    /* Тир 1: автогенерация */ [
      () => { const angles = [0, 30, 45, 60, 90, 180]; const ang = angles[int(r, 0, 5)]!; const fn = ['sin', 'cos', 'tan'][int(r, 0, 2)]!; const ansMap: Record<string, string> = { '0sin': '0', '0cos': '1', '30sin': '0.5', '30cos': 'sqrt(3)/2', '45sin': 'sqrt(2)/2', '45cos': 'sqrt(2)/2', '45tan': '1', '60sin': 'sqrt(3)/2', '60cos': '0.5', '60tan': 'sqrt(3)', '90sin': '1', '90cos': '0', '180sin': '0', '180cos': '-1' }; const ans = ansMap[`${ang}${fn}`] ?? '1'; return { question: `${fn}(${ang}°) = ?`, answer: ans, difficulty: 1 }; },
      () => { const s = trigBasic[int(r, 0, trigBasic.length - 1)]!; return { question: `${s.fn}(${s.angle}°) = ?`, answer: s.ans, difficulty: 1 }; },
      () => { const angles = [30, 45, 60]; const ang = angles[int(r, 0, 2)]!; const fn = int(r, 0, 1) ? 'sin' : 'cos'; const ans = ang === 30 ? (fn === 'sin' ? '0.5' : 'sqrt(3)/2') : ang === 60 ? (fn === 'sin' ? 'sqrt(3)/2' : '0.5') : 'sqrt(2)/2'; return { question: `${fn}(${ang}°) = ?`, answer: ans, difficulty: 1 }; },
      () => { const k = int(r, 1, 3); return { question: `tan(${45 * k}°) = ?`, answer: k === 1 ? '1' : k === 2 ? '-1' : '-1', difficulty: 1 }; },
      () => { const ang = [0, 30, 45, 60, 90][int(r, 0, 4)]!; const fn = ['sin', 'cos'][int(r, 0, 1)]!; const ans: Record<string, string> = { '0sin': '0', '0cos': '1', '30sin': '0.5', '30cos': 'sqrt(3)/2', '45sin': 'sqrt(2)/2', '45cos': 'sqrt(2)/2', '60sin': 'sqrt(3)/2', '60cos': '0.5', '90sin': '1', '90cos': '0' }; return { question: `${fn}(${ang}°) = ?`, answer: ans[`${ang}${fn}`] ?? '1', difficulty: 1 }; },
    ],
    /* Тир 2: автогенерация */ [
      () => { const angles = [30, 45, 60]; const ang = angles[int(r, 0, 2)]!; const fn = ['sin', 'cos', 'tan'][int(r, 0, 2)]!; const map: Record<string, string> = { '30sin': '1/2', '30cos': 'sqrt(3)/2', '30tan': 'sqrt(3)/3', '45sin': 'sqrt(2)/2', '45cos': 'sqrt(2)/2', '45tan': '1', '60sin': 'sqrt(3)/2', '60cos': '1/2', '60tan': 'sqrt(3)' }; const dec: Record<string, string> = { '30sin': '0.5', '30cos': '0.866', '30tan': '0.577', '45sin': '0.707', '45cos': '0.707', '60sin': '0.866', '60cos': '0.5', '60tan': '1.732' }; return { question: `${fn}(${ang}°) = ?`, answer: map[`${ang}${fn}`] ?? '1', difficulty: 2, acceptedAnswers: dec[`${ang}${fn}`] ? [dec[`${ang}${fn}`]] : undefined }; },
      () => { const s = trigTable[int(r, 0, trigTable.length - 1)]!; return { question: `${s.fn}(${s.angle}°) = ?`, answer: s.ans, difficulty: 2, acceptedAnswers: [s.dec] }; },
      () => { const angles = [30, 45, 60]; const ang = angles[int(r, 0, 2)]!; const fn = ['sin', 'cos', 'tan'][int(r, 0, 2)]!; const map: Record<string, string> = { '30sin': '1/2', '30cos': 'sqrt(3)/2', '30tan': 'sqrt(3)/3', '45sin': 'sqrt(2)/2', '45cos': 'sqrt(2)/2', '45tan': '1', '60sin': 'sqrt(3)/2', '60cos': '1/2', '60tan': 'sqrt(3)' }; const ans = map[`${ang}${fn}`] ?? '1'; const dec: Record<string, string> = { '30sin': '0.5', '30cos': '0.866', '30tan': '0.577', '45sin': '0.707', '45cos': '0.707', '60sin': '0.866', '60cos': '0.5', '60tan': '1.732' }; return { question: `${fn}(${ang}°) = ?`, answer: ans, difficulty: 2, acceptedAnswers: dec[`${ang}${fn}`] ? [dec[`${ang}${fn}`]] : undefined }; },
    ],
    /* Тир 3: автогенерация */ [
      () => { const pairs: Array<{ fn: string; ang: number; ans: string }> = [ { fn: 'sin', ang: 30, ans: '1' }, { fn: 'cos', ang: 60, ans: '1' }, { fn: 'sin', ang: 60, ans: 'sqrt(3)' }, { fn: 'cos', ang: 30, ans: 'sqrt(3)' } ]; const p = pairs[int(r, 0, 3)]!; return { question: `2·${p.fn}(${p.ang}°) = ?`, answer: p.ans, difficulty: 3, acceptedAnswers: p.ans === 'sqrt(3)' ? ['1.732'] : undefined }; },
      () => { const combos: Array<{ q: string; a: string }> = [ { q: 'sin(30°) + cos(60°)', a: '1' }, { q: 'sin(45°) + cos(45°)', a: 'sqrt(2)' }, { q: '2·cos(60°)', a: '1' }, { q: '2·sin(30°)', a: '1' }, { q: 'sin(60°) + cos(30°)', a: 'sqrt(3)' } ]; const c = combos[int(r, 0, combos.length - 1)]!; return { question: `${c.q} = ?`, answer: c.a, difficulty: 3, acceptedAnswers: c.a === 'sqrt(2)' ? ['1.414'] : c.a === 'sqrt(3)' ? ['1.732'] : undefined }; },
      () => { const ang = [30, 45, 60][int(r, 0, 2)]!; return { question: `sin²(${ang}°) + cos²(${ang}°) = ?`, answer: '1', difficulty: 3 }; },
      () => { const ang = [30, 45, 60][int(r, 0, 2)]!; const ans = ang === 30 ? 'sqrt(3)/3' : ang === 45 ? '1' : 'sqrt(3)'; return { question: `tan(${ang}°) = ?`, answer: ans, difficulty: 3, acceptedAnswers: ang === 60 ? ['1.732'] : ang === 30 ? ['0.577'] : undefined }; },
      () => { const k = int(r, 2, 5); return { question: `${k}·sin(45°) + ${k}·cos(45°) = ?`, answer: `sqrt(2)·${k}`, difficulty: 3, acceptedAnswers: [String(Math.round(k * 1.414 * 1000) / 1000)] }; },
      () => { const ang = [30, 60][int(r, 0, 1)]!; const fn = ang === 30 ? 'sin' : 'cos'; return { question: `2·${fn}(${ang}°) = ?`, answer: '1', difficulty: 3 }; },
    ],
    /* Тир 4: автогенерация */ [
      () => { const formulas: Array<{ q: string; a: string }> = [ { q: 'ctg(π + x)', a: 'ctg(x)' }, { q: 'tg(π + x)', a: 'tg(x)' }, { q: 'sin(π + x)', a: '-sin(x)' }, { q: 'cos(π + x)', a: '-cos(x)' }, { q: 'tg(270° + α)', a: '-ctg(α)' }, { q: 'sin(-x)', a: '-sin(x)' }, { q: 'cos(-x)', a: 'cos(x)' }, { q: 'tg(π + α)', a: 'tg(α)' } ]; const v = formulas[int(r, 0, formulas.length - 1)]!; return { question: `${v.q} = ?`, answer: v.a, difficulty: 4 }; },
      () => { const degs = [-585, 945, -405, 405, -675, 495, -315]; const ansList = ['sqrt(2)/2', '-sqrt(2)/2', '-sqrt(2)/2', 'sqrt(2)/2', 'sqrt(2)/2', '-sqrt(2)/2', 'sqrt(2)/2']; const decList = ['0.707', '-0.707', '-0.707', '0.707', '0.707', '-0.707', '0.707']; const i = int(r, 0, degs.length - 1); return { question: `sin(${degs[i]}°) = ?`, answer: ansList[i]!, difficulty: 4, acceptedAnswers: [decList[i]] }; },
      () => { const formulas: Array<{ q: string; a: string }> = [ { q: 'cos(π + α)', a: '-cos(α)' }, { q: 'ctg(π + α)', a: 'ctg(α)' }, { q: 'sin(π/2 + x)', a: 'cos(x)' }, { q: 'cos(π/2 - α)', a: 'sin(α)' } ]; const v = formulas[int(r, 0, formulas.length - 1)]!; return { question: `${v.q} = ?`, answer: v.a, difficulty: 4 }; },
    ],
    /* Тир 5: автогенерация */ [
      () => { const k = int(r, 2, 6), n = int(r, 2, 5); return { question: `${k}cos²(${n}x) + ${k}sin²(${n}x) = ?`, answer: String(k), difficulty: 5 }; },
      () => { const a = int(r, 1, 4); return { question: `sin²(${a}x) – cos²(${a}x) = ?`, answer: `-cos(${2 * a}x)`, difficulty: 5 }; },
      () => { const shift = int(r, 0, 1); const q = shift === 0 ? 'cos(x + π/2) = ?' : 'cos(x + 3π/2) = ?'; const a = shift === 0 ? '-sin(x)' : 'sin(x)'; return { question: q, answer: a, difficulty: 5 }; },
      () => { const k = int(r, 2, 4); const pairs: Array<[number, number]> = [[75, 15], [60, 30]]; const [a, b] = pairs[int(r, 0, 1)]!; return { question: `${k}cos²(${a}°) + ${k}cos²(${b}°) = ?`, answer: String(k), difficulty: 5 }; },
      () => { const n = int(r, 2, 5); return { question: `cos²(${n}x) + sin²(${n}x) = ?`, answer: '1', difficulty: 5 }; },
    ],
    /* Тир 6: автогенерация */ [
      () => { const a = int(r, 10, 80); const b = 180 - a; return { question: `cos(${a}°) + cos(${b}°) = ?`, answer: '0', difficulty: 6 }; },
      () => { const a = int(r, 15, 75); const b = 180 - a; return { question: `sin(${a}°) + sin(${b}°) = ?`, answer: '0', difficulty: 6 }; },
      () => { const k = int(r, 2, 5); return { question: `${k} + 4cos(2α) + cos(4α) = ?`, answer: k === 3 ? '2(1+cos(2α))²' : `2(1+cos(2α))² + ${k - 3}`, difficulty: 6 }; },
      () => { const c = int(r, 1, 3); return { question: `sin(α)/(${c}+cos(α)) + (${c}+cos(α))/sin(α) = ?`, answer: c === 1 ? '2/sin(α)' : `2${c}/sin(α)`, difficulty: 6 }; },
      () => { const k = int(r, 2, 4); const add = k - 3; const ans = add === 0 ? '2(1+cos(2α))²' : add > 0 ? `2(1+cos(2α))² + ${add}` : `2(1+cos(2α))² - ${-add}`; return { question: `${k} + 4cos(2α) + cos(4α) = ?`, answer: ans, difficulty: 6 }; },
      () => { const sets: Array<{ angles: number[] }> = [ { angles: [24, 5, 175, 204, 300] }, { angles: [20, 10, 175, 190, 300] }, { angles: [30, 0, 180, 210, 300] } ]; const s = sets[int(r, 0, sets.length - 1)]!; const sum = s.angles.map(d => Math.cos(d * Math.PI / 180)).reduce((a, b) => a + b, 0); const ans = Math.abs(sum - 0.5) < 0.01 ? '0.5' : String(Math.round(sum * 100) / 100); return { question: s.angles.map(d => `cos(${d}°)`).join(' + ') + ' = ?', answer: ans, difficulty: 6, acceptedAnswers: ans === '0.5' ? ['1/2'] : undefined }; },
    ],
    /* Тир 7: автогенерация */ [
      () => { const a = 2 * int(r, 1, 5), b = 1 + 4 * int(r, 0, 2); return { question: `cos(${a}x) + sin(${b}x/2) = 2. Решить.`, answer: 'x = π + 4πk', difficulty: 7 }; },
      () => { const k = int(r, 1, 2); return { question: `${k > 1 ? k + '·' : ''}ctg²(x) − tg(x + π/4) = ${k}. Решить.`, answer: 'x = π/4 + πn', difficulty: 7 }; },
      () => { const c = int(r, 2, 4); return { question: `${c}·|sin(x) + cos(x)| = ${c} + sin⁶(8x). Решить.`, answer: 'x = π/4 + πn', difficulty: 7 }; },
      () => { const a = 2 * int(r, 2, 4); return { question: `cos(${a}x) + sin(${a}x/2) = 2. Решить.`, answer: 'x = π + 4πk', difficulty: 7 }; },
      () => { const k = int(r, 2, 5); return { question: `${k}cos²(nx) + ${k}sin²(nx) = ?`, answer: String(k), difficulty: 7 }; },
      () => { const n = int(r, 2, 6); return { question: `sin²(${n}x) + cos²(${n}x) = ?`, answer: '1', difficulty: 7 }; },
    ],
  ];

  return { arithmetic: arithmetic(), equations: equations(), logarithms: logarithms(), trigonometry: trigonometry() };
}

/** Генерация одного задания: навык и уровень (1–7) — у каждого навыка 7 тиров. */
function generateOneQuestion(
  seed: number,
  difficulty: DifficultyLevel,
  skill?: SkillKey
): PracticeQuestion {
  const r = seeded(seed);
  const tiers = buildTiersBySkill(r);
  const chosenSkill = skill ?? SKILL_ORDER[Math.abs(seed) % SKILL_ORDER.length]!;
  const tierTemplates = tiers[chosenSkill][difficulty - 1];
  if (!tierTemplates || tierTemplates.length === 0) {
    const fallback = getFallbackForSkill(chosenSkill, seed);
    return { ...fallback, difficulty };
  }
  const idx = int(r, 0, tierTemplates.length - 1);
  const q = tierTemplates[idx]!();
  return { ...q, difficulty };
}

export const mockQuestions: PracticeQuestion[] = [
  // Easy
  { question: '12 + 19', answer: '31', difficulty: 1 },
  { question: '3 * 8', answer: '24', difficulty: 1 },
  { question: '15 + 8 - 6', answer: '17', difficulty: 1 },
  { question: '4 * 5 + 7', answer: '27', difficulty: 1 },
  { question: 'x - 5 = 10', answer: '15', difficulty: 1 },
  { question: '45 / 9', answer: '5', difficulty: 1 },
  { question: '2y = 14', answer: '7', difficulty: 1 },
  { question: 'sin(90°) = ?', answer: '1', difficulty: 1 },
  { question: 'tan(45°) = ?', answer: '1', difficulty: 1 },

  // Medium
  { question: '3x + 7 = 19', answer: '4', difficulty: 2 },
  { question: '2x + 3 = 15 - 4', answer: '4', difficulty: 2 },
  { question: '5 * (x - 2) = 15', answer: '5', difficulty: 2 },
  { question: 'frac{x}{4} + 2 = 5', answer: '12', difficulty: 2 },
  { question: 'frac{x}{3} + 2 - 1 = 6', answer: '15', difficulty: 2, acceptedAnswers: ['15.0', '15,0'] },
  { question: 'x^(2) = 49', answer: '7,-7', difficulty: 2 },
  { question: 'x^(2) + 4 = 29', answer: '5,-5', difficulty: 2 },
  { question: '150 * 20%', answer: '30', difficulty: 2 },
  { question: '100 * 25% + 10', answer: '35', difficulty: 2 },
  { question: '100 * 20% + 5x = 40', answer: '4', difficulty: 2 },
  { question: '80 - 20%', answer: '64', difficulty: 2 },
  { question: '25 + 15 - 8', answer: '32', difficulty: 2 },
  { question: 'sin(30°) = ?', answer: '0.5', difficulty: 2 },
  { question: 'cos(45°) = ?', answer: 'sqrt(2)/2', acceptedAnswers: ['0.707'], difficulty: 2 },

  // Hard
  { question: 'x^(2) + 5x + 6 = 0', answer: '-2,-3', difficulty: 3 },
  { question: '2x^(2) - 3x - 2 = 0', answer: '2,-0.5', difficulty: 3 },
  { question: 'sqrt(x + 2) = 3', answer: '7', difficulty: 3 },
  { question: 'system{x+y=10; x-y=4}', answer: 'x=7,y=3', difficulty: 3 },
  { question: 'log[2](8)', answer: '3', difficulty: 3 },
  { question: 'tan(60°) = ?', answer: 'sqrt(3)', acceptedAnswers: ['1.732'], difficulty: 3 },
  { question: 'sin²(30°) + cos²(30°) = ?', answer: '1', difficulty: 3 },
];

export const PLAYER_LEVELS: PlayerLevel[] = [
    { name: "Initiate", minXp: 0, badgeColor: "border-gray-500" },
    { name: "Apprentice", minXp: 500, badgeColor: "border-cyan-500" },
    { name: "Adept", minXp: 1500, badgeColor: "border-blue-500" },
    { name: "Prodigy", minXp: 3000, badgeColor: "border-purple-500" },
    { name: "Sage", minXp: 5000, badgeColor: "border-violet-400" },
    { name: "Neural Elite", minXp: 10000, badgeColor: "border-fuchsia-500" },
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
    { id: 'first_blood', name: 'First Step', description: 'Complete your first Daily Challenge.', icon: '👟', threshold: stats => (stats.streak || 0) >= 1 },
    { id: 'streak_2', name: 'Double Day', description: 'Complete Daily Challenge 2 days in a row.', icon: '🌤️', threshold: stats => (stats.streak || 0) >= 2 },
    { id: 'streak_3', name: 'Three in a Row', description: 'Complete Daily Challenge 3 days in a row.', icon: '🔥', threshold: stats => (stats.streak || 0) >= 3 },
    { id: 'streak_5', name: 'Five Day Run', description: 'Maintain a 5-day challenge streak.', icon: '💪', threshold: stats => (stats.streak || 0) >= 5 },
    { id: 'streak_7', name: 'Week-long Focus', description: 'Maintain a 7-day challenge streak.', icon: '🗓️', threshold: stats => (stats.streak || 0) >= 7 },
    { id: 'streak_14', name: 'Two Week Warrior', description: 'Maintain a 14-day challenge streak.', icon: '🛡️', threshold: stats => (stats.streak || 0) >= 14 },
    { id: 'streak_30', name: 'Monthly Dedication', description: 'Maintain a 30-day challenge streak.', icon: '📅', threshold: stats => (stats.streak || 0) >= 30 },
    { id: 'perfect_score', name: 'Perfect Precision', description: 'Get a 100% score on a Daily Challenge.', icon: '🎯', threshold: stats => (stats.totalQuestions ?? 0) > 0 && (stats.correctAnswers ?? 0) === (stats.totalQuestions ?? 0) },
    { id: 'accuracy_80', name: 'Sharp Mind', description: 'Score 80% or higher on a Daily Challenge.', icon: '✂️', threshold: stats => (stats.totalQuestions ?? 0) > 0 && ((stats.correctAnswers ?? 0) / (stats.totalQuestions ?? 1)) >= 0.8 },
    { id: 'accuracy_90', name: 'Near Perfect', description: 'Score 90% or higher on a Daily Challenge.', icon: '💎', threshold: stats => (stats.totalQuestions ?? 0) > 0 && ((stats.correctAnswers ?? 0) / (stats.totalQuestions ?? 1)) >= 0.9 },
    { id: 'solve_5', name: 'Half Dozen', description: 'Solve at least 5 questions correctly in one challenge.', icon: '5️⃣', threshold: stats => (stats.correctAnswers ?? 0) >= 5 },
    { id: 'solve_8', name: 'Almost There', description: 'Solve at least 8 questions correctly in one challenge.', icon: '8️⃣', threshold: stats => (stats.correctAnswers ?? 0) >= 8 },
    { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a Daily Challenge in under 60 seconds.', icon: '⚡️', threshold: stats => (stats.timeTaken ?? 1000) < 60 },
    { id: 'speed_120', name: 'Quick Thinker', description: 'Complete a Daily Challenge in under 2 minutes.', icon: '⏱️', threshold: stats => (stats.timeTaken ?? 999) < 120 },
    { id: 'speed_180', name: 'Under Three', description: 'Complete a Daily Challenge in under 3 minutes.', icon: '🕒', threshold: stats => (stats.timeTaken ?? 999) < 180 },
    { id: 'speed_240', name: 'Four Minute Finish', description: 'Complete a Daily Challenge in under 4 minutes.', icon: '⏳', threshold: stats => (stats.timeTaken ?? 999) < 240 },
    { id: 'speed_300', name: 'Steady Pace', description: 'Complete a Daily Challenge in under 5 minutes.', icon: '🏁', threshold: stats => (stats.timeTaken ?? 999) < 300 },
    { id: 'xp_250', name: 'Getting Started', description: 'Reach 250 cognitive XP.', icon: '🌱', threshold: stats => (stats.xp || 0) >= 250 },
    { id: 'xp_500', name: 'Rising Star', description: 'Reach 500 cognitive XP.', icon: '⭐', threshold: stats => (stats.xp || 0) >= 500 },
    { id: 'xp_750', name: 'Momentum', description: 'Reach 750 cognitive XP.', icon: '📈', threshold: stats => (stats.xp || 0) >= 750 },
    { id: 'xp_1000', name: 'Knowledge Seeker', description: 'Reach 1,000 cognitive XP.', icon: '🧠', threshold: stats => (stats.xp || 0) >= 1000 },
    { id: 'xp_2000', name: 'Serious Student', description: 'Reach 2,000 cognitive XP.', icon: '📖', threshold: stats => (stats.xp || 0) >= 2000 },
    { id: 'xp_3000', name: 'Dedicated Learner', description: 'Reach 3,000 cognitive XP.', icon: '📚', threshold: stats => (stats.xp || 0) >= 3000 },
    { id: 'xp_4000', name: 'Expert in Training', description: 'Reach 4,000 cognitive XP.', icon: '🔬', threshold: stats => (stats.xp || 0) >= 4000 },
    { id: 'xp_5000', name: 'Sage', description: 'Reach 5,000 cognitive XP.', icon: '🎓', threshold: stats => (stats.xp || 0) >= 5000 },
    { id: 'xp_7500', name: 'Master Mind', description: 'Reach 7,500 cognitive XP.', icon: '🧙', threshold: stats => (stats.xp || 0) >= 7500 },
    { id: 'xp_10000', name: 'Neural Elite', description: 'Reach 10,000 cognitive XP.', icon: '👑', threshold: stats => (stats.xp || 0) >= 10000 },
    { id: 'xp_15000', name: 'Legend', description: 'Reach 15,000 cognitive XP.', icon: '🏆', threshold: stats => (stats.xp || 0) >= 15000 },
    { id: 'xp_20000', name: 'Algebra Champion', description: 'Reach 20,000 cognitive XP.', icon: '🥇', threshold: stats => (stats.xp || 0) >= 20000 },
    { id: 'solve_10', name: 'Full Set', description: 'Solve all 5 questions correctly in one Daily Challenge.', icon: '✨', threshold: stats => (stats.correctAnswers ?? 0) >= 5 },
];


const challengeTemplates = [
    { 
        title: "Algebra Speed Drill", 
        description: "Solve 5 problems in under 3 minutes", 
        aiNarrative: "Today’s challenge targets your speed in fundamental algebra. Let's sharpen those core skills!",
        timeLimit: 180, // 3 minutes
        reward: 120,
        brainPoints: 50,
        questionTypes: ['easy', 'medium']
    },
    { 
        title: "Geometry Challenge", 
        description: "Test your knowledge of shapes and angles", 
        aiNarrative: "I've noticed you haven't practiced Geometry in a while. Let's refresh those concepts.",
        timeLimit: 240, // 4 minutes
        reward: 150,
        brainPoints: 60,
        questionTypes: ['medium'] 
    },
    { 
        title: "Logic Puzzle", 
        description: "A tricky problem to test your logic", 
        aiNarrative: "This one requires thinking outside the box. A great workout for your logical reasoning.",
        timeLimit: 300, // 5 minutes
        reward: 200,
        brainPoints: 80,
        questionTypes: ['hard']
    },
     { 
        title: "Weak Area Focus: Quadratics", 
        description: "Strengthen your skills with quadratic equations", 
        aiNarrative: "Today’s challenge targets your weak topic: Functions. Let's turn this into a strength.",
        timeLimit: 240, // 4 minutes
        reward: 140,
        brainPoints: 70,
        questionTypes: ['hard'] 
    },
];

/** Все 7 уровней сложности (тиры 1–7). */
const DIFFICULTY_LEVELS: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7];

const STORAGE_KEY_DAILY_SEED = 'algebrain_daily_seed';

/** Базовая сложность по выбору из онбоардинга: middle/null = 2, High School = 3, Advanced = 4. */
export type PreparationLevel = 'middle' | 'high' | 'advanced' | null;

export function getBaseDifficulty(preparationLevel: PreparationLevel): DifficultyLevel {
  if (preparationLevel === 'advanced') return 4;
  if (preparationLevel === 'high') return 3;
  return 2; // middle или null — базовая сложность 2
}

export const SKILL_ORDER: SkillKey[] = ['arithmetic', 'equations', 'logarithms', 'trigonometry'];

/** Генерирует один следующий вопрос для практики (для адаптивной сложности по ходу сессии). */
export function generateNextPracticeQuestion(
  skill: SkillKey,
  difficulty: DifficultyLevel,
  seenInSession: Set<string>,
  excludeRecent?: Set<string>
): PracticeQuestion {
  const seed = Math.floor(Date.now() + Math.random() * 2147483647);
  return generateOneQuestionForSkill(seed, difficulty, skill, seenInSession, excludeRecent);
}

/** Уникальный seed пользователя (устройства): один раз сохраняется в localStorage, у разных пользователей — разные задания */
function getUserChallengeSeed(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STORAGE_KEY_DAILY_SEED);
  if (stored != null) {
    const n = parseInt(stored, 10);
    if (!isNaN(n)) return n;
  }
  const seed = Math.floor(Math.random() * 2147483647);
  localStorage.setItem(STORAGE_KEY_DAILY_SEED, String(seed));
  return seed;
}

/** Один вопрос из mockQuestions с заданным навыком (для fallback). */
function getFallbackForSkill(skill: SkillKey, seed: number): PracticeQuestion {
  const bySkill = mockQuestions.filter(q => getSkillFromQuestion(q.question) === skill);
  if (bySkill.length === 0) return mockQuestions[0]!;
  const idx = Math.abs(seed) % bySkill.length;
  return bySkill[idx]!;
}

/** Генерирует один вопрос заданной сложности (тир 1–7) и навыка; тиры свои у каждого навыка. Приоритет — автогенерация, fallback на mock — только при неудаче. */
function generateOneQuestionForSkill(
  seed: number,
  difficulty: DifficultyLevel,
  skill: SkillKey,
  seen: Set<string>,
  excludeRecent?: Set<string>
): PracticeQuestion {
  const allowed = (q: PracticeQuestion) => !seen.has(q.question) && !excludeRecent?.has(q.question);
  for (let attempt = 0; attempt < 120; attempt++) {
    const q = generateOneQuestion(seed + attempt * 5003, difficulty, skill);
    if (getSkillFromQuestion(q.question) === skill && allowed(q)) {
      seen.add(q.question);
      return q;
    }
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const q = generateOneQuestion(seed + 777777 + attempt * 123456, difficulty, skill);
    if (getSkillFromQuestion(q.question) === skill && allowed(q)) {
      seen.add(q.question);
      return q;
    }
  }
  const highTier = difficulty >= 5;
  if (!highTier) {
    const bySkill = mockQuestions.filter(m => getSkillFromQuestion(m.question) === skill);
    for (let i = 0; i < bySkill.length + 5; i++) {
      const q = bySkill.length > 0 ? bySkill[i % bySkill.length]! : generateOneQuestion(seed + 99999 + i * 11111, difficulty, skill);
      if (allowed(q)) {
        seen.add(q.question);
        return { ...q, difficulty };
      }
    }
    const fallback = getFallbackForSkill(skill, seed);
    if (allowed(fallback)) {
      seen.add(fallback.question);
      return { ...fallback, difficulty };
    }
  }
  const lastTry = generateOneQuestion(seed + 888888, difficulty, skill);
  seen.add(lastTry.question);
  return lastTry;
}

/** Пары (уровень 1–7, навык): в каждом из 7 уровней — по одному заданию на каждый из 4 навыков (всего до 28 пар). */
function getDifficultySkillPairs(count: number): Array<{ difficulty: DifficultyLevel; skill: SkillKey }> {
  const pairs: Array<{ difficulty: DifficultyLevel; skill: SkillKey }> = [];
  for (const diff of DIFFICULTY_LEVELS) {
    for (const skill of SKILL_ORDER) {
      pairs.push({ difficulty: diff, skill });
    }
  }
  return count <= pairs.length ? pairs.slice(0, count) : [...pairs];
}

const STORAGE_KEY_PRACTICE_RUN = 'algebrain_practice_run';

/** Инкремент счётчика запусков практики для разного сида при каждом новом прохождении. */
function nextPracticeRunSeed(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRACTICE_RUN);
    const n = (raw ? parseInt(raw, 10) : 0) + 1;
    if (!Number.isFinite(n)) return 0;
    localStorage.setItem(STORAGE_KEY_PRACTICE_RUN, String(n % 1_000_000));
    return n;
  } catch {
    return 0;
  }
}

/** Пары (сложность 1–7, навык) для практики: генерируем базовый набор и перемешиваем по seed, чтобы при повторных прохождениях порядок и состав отличались. */
function getPracticeDifficultySkillPairs(
  count: number,
  baseDifficulty: DifficultyLevel,
  shuffleSeed: number
): Array<{ difficulty: DifficultyLevel; skill: SkillKey }> {
  const pool: Array<{ difficulty: DifficultyLevel; skill: SkillKey }> = [];
  for (let i = 0; i < count; i++) {
    const skill = SKILL_ORDER[i % SKILL_ORDER.length]!;
    const difficulty = (1 + ((baseDifficulty - 1) + i) % 7) as DifficultyLevel;
    pool.push({ difficulty, skill });
  }
  const r = seeded(shuffleSeed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool;
}

const STORAGE_KEY_LAST_QUESTIONS = 'algebrain_last_practice_questions';
const MAX_LAST_QUESTIONS = 60;

/** Вопросы из прошлой сессии практики (чтобы не повторять подряд). */
export function getLastPracticeQuestionTexts(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_QUESTIONS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.slice(-MAX_LAST_QUESTIONS)) : new Set();
  } catch {
    return new Set();
  }
}

/** Сохранить тексты вопросов завершённой сессии для исключения при следующей генерации. */
export function saveLastPracticeQuestionTexts(questions: Array<{ question: string }> | undefined): void {
  if (!questions?.length) return;
  try {
    const texts = questions.map(q => q.question).slice(-MAX_LAST_QUESTIONS);
    localStorage.setItem(STORAGE_KEY_LAST_QUESTIONS, JSON.stringify(texts));
  } catch {}
}

/** Генерация уникальных вопросов для практики. Сложность: 2 (базовая), 3 (High School), 4 (Advanced). */
export function generatePracticeQuestions(
  count: number,
  baseSeed?: number,
  preparationLevel?: PreparationLevel,
  excludeRecent?: Set<string>
): PracticeQuestion[] {
  const runOffset = nextPracticeRunSeed() * 1000003;
  const seed0 = baseSeed ?? Math.floor(Date.now() + Math.random() * 2147483647) + runOffset;
  const baseDifficulty = getBaseDifficulty(preparationLevel ?? null);
  const pairs = getPracticeDifficultySkillPairs(count, baseDifficulty, seed0);
  const seen = new Set<string>();
  const questions: PracticeQuestion[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const { difficulty, skill } = pairs[i]!;
    const slotSeed = seed0 + i * 7919 + (i * 31) + (i * i * 17);
    const q = generateOneQuestionForSkill(slotSeed, difficulty, skill, seen, excludeRecent);
    questions.push(q);
  }
  const shuffleR = seeded(seed0 + 123456);
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(shuffleR() * (i + 1));
    [questions[i], questions[j]] = [questions[j]!, questions[i]!];
  }
  return questions;
}

/** Подборка только по проблемным темам (навыкам): все задания из skillKeys, смесь сложностей. */
export function generatePracticeQuestionsForSkills(
  count: number,
  skillKeys: SkillKey[],
  baseSeed?: number,
  excludeRecent?: Set<string>
): PracticeQuestion[] {
  if (skillKeys.length === 0) return generatePracticeQuestions(count, baseSeed, undefined, excludeRecent);
  const runOffset = nextPracticeRunSeed() * 1000003;
  const seed0 = baseSeed ?? Math.floor(Date.now() + Math.random() * 2147483647) + runOffset;
  const seen = new Set<string>();
  const difficulties: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7];
  const pairPool = skillKeys.flatMap((skill, si) =>
    difficulties.map((diff, di) => ({ skill, difficulty: diff as DifficultyLevel }))
  );
  const r = seeded(seed0);
  for (let i = pairPool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pairPool[i], pairPool[j]] = [pairPool[j]!, pairPool[i]!];
  }
  const questions: PracticeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const { skill, difficulty } = pairPool[i % pairPool.length]!;
    const slotSeed = seed0 + i * 7919 + (i * 31) + (i * i * 17);
    const q = generateOneQuestionForSkill(slotSeed, difficulty, skill, seen, excludeRecent);
    questions.push(q);
  }
  const shuffleR = seeded(seed0 + 123456);
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(shuffleR() * (i + 1));
    [questions[i], questions[j]] = [questions[j]!, questions[i]!];
  }
  return questions;
}

export const generateDailyChallenge = (preparationLevel?: PreparationLevel): DailyChallenge => {
    const today = new Date();
    const year = today.getFullYear();
    const dayOfYear = Math.floor((today.getTime() - new Date(year, 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const template = challengeTemplates[dayOfYear % challengeTemplates.length];
    const userSeed = getUserChallengeSeed();
    const baseDifficulty = getBaseDifficulty(preparationLevel ?? null);
    const seen = new Set<string>();
    const challengeQuestions: PracticeQuestion[] = [];

    // Ровно 5 заданий: навыки по кругу (4 типа + 1 повтор)
    const DAILY_CHALLENGE_COUNT = 5;
    for (let i = 0; i < DAILY_CHALLENGE_COUNT; i++) {
        const skill = SKILL_ORDER[i % SKILL_ORDER.length]!;
        const baseSeed = year * 100000 + dayOfYear * 10000 + i * 1000 + userSeed * 1009;
        const q = generateOneQuestionForSkill(baseSeed, baseDifficulty, skill, seen);
        challengeQuestions.push(q);
    }

    // Перемешать порядок (детерминированно по дню и пользователю)
    const shuffleSeed = seeded(year * 12345 + dayOfYear + userSeed * 1009);
    for (let i = challengeQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(shuffleSeed() * (i + 1));
        [challengeQuestions[i], challengeQuestions[j]] = [challengeQuestions[j]!, challengeQuestions[i]!];
    }

    return {
        id: `challenge-${today.toISOString().split('T')[0]}`,
        ...template,
        questions: challengeQuestions
    };
};