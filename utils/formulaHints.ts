import type { SkillKey } from '../screens/assessment/types';

export interface FormulaEntry {
  expr: string;
  /** Если задано — формула показывается только когда when(question) === true. */
  when?: (question: string) => boolean;
}

const isLinearEquation = (q: string) =>
  !/system\{/.test(q) && !/x\^\(2\)|x²/.test(q) && (/\d*x\s*\+|frac\{x\}|x\s*\/\s*\d+/.test(q) || /x\s*-\s*\d+\s*=/.test(q) || /^\d*x\s*=/.test(q));
const isQuadraticEquation = (q: string) => /x\^\(2\)|x²/.test(q) && !/system\{/.test(q);
const isSystemEquation = (q: string) => /system\{/.test(q);

const FORMULA_PERCENT = { expr: 'N * p% = N * p / 100' };

const ARITHMETIC_TIER2_FORMULAS: Array<{ expr: string }> = [
  { expr: 'sqrt(a) * sqrt(b) = sqrt(a * b)' },
  { expr: 'sqrt(a) / sqrt(b) = sqrt(a / b)' },
  { expr: 'sqrt(x) = x^(1/2)' },
  { expr: '(sqrt(a))^(2) = a' },
  { expr: 'a^(m) * a^(n) = a^(m+n)' },
  { expr: 'a^(m) / a^(n) = a^(m-n)' },
  { expr: '(a^(m))^(n) = a^(m*n)' },
];

const ARITHMETIC_TIER3_FORMULAS: Array<{ expr: string }> = [
  { expr: 'frac{a}{b} + frac{c}{b} = frac{a+c}{b}' },
  { expr: 'frac{a}{b} - frac{c}{b} = frac{a-c}{b}' },
];

const ARITHMETIC_TIER4_FORMULAS: Array<{ expr: string }> = [
  { expr: 'frac{a}{b} + frac{c}{d} = frac{a*d + b*c}{b*d}' },
  { expr: 'frac{a}{b} - frac{c}{d} = frac{a*d - b*c}{b*d}' },
  { expr: 'frac{a}{b} = frac{a*k}{b*k}' },
];

const ARITHMETIC_TIER5_FORMULAS: Array<{ expr: string }> = [
  { expr: 'sqrt(a) * sqrt(b) = sqrt(a * b)' },
  { expr: '(sqrt(a) - sqrt(b))(sqrt(a) + sqrt(b)) = a - b' },
  { expr: 'frac{a}{b} + frac{c}{b} = frac{a+c}{b}' },
  { expr: 'frac{a}{b} - frac{c}{b} = frac{a-c}{b}' },
];

const ARITHMETIC_TIER6_FORMULAS: Array<{ expr: string }> = [
  { expr: 'frac{a}{b/c} = frac{a*c}{b}' },
  { expr: 'frac{1}{a/b} = frac{b}{a}' },
  { expr: 'frac{a}{b} * frac{c}{d} = frac{a*c}{b*d}' },
];

const ARITHMETIC_TIER7_FORMULAS: Array<{ expr: string }> = [
  { expr: 'frac{1}{n(n+k)} = frac{1}{k}(frac{1}{n} - frac{1}{n+k})' },
  { expr: 'frac{1}{a*b} = frac{1}{b-a}(frac{1}{a} - frac{1}{b})' },
];

const FORMULAS_BY_SKILL: Record<SkillKey, FormulaEntry[]> = {
  arithmetic: [
    { expr: 'a + b = c' },
    { expr: 'a * b = c' },
    { expr: 'frac{a}{b} = c' },
    FORMULA_PERCENT,
  ],
  equations: [
    { expr: 'a*x - b = x + c | a*x - x = c + b', when: isLinearEquation },
    { expr: 'a*x + b = c', when: isLinearEquation },
    { expr: 'x = (c - b)/a', when: isLinearEquation },
    { expr: 'x^(2) = k', when: isQuadraticEquation },
    { expr: 'x^(2) = k^(2) => (x-k)(x+k) = 0', when: isQuadraticEquation },
    { expr: 'x^(2) + b*x + c = 0', when: isQuadraticEquation },
    { expr: 'x₁ = (-b + sqrt(b^(2)-4*a*c))/(2*a) | x₂ = (-b - sqrt(b^(2)-4*a*c))/(2*a)', when: isQuadraticEquation },
    { expr: 'x₁ + x₂ = -b/a | x₁ * x₂ = c/a', when: isQuadraticEquation },
    { expr: 'system{x+y=a; x-y=b}', when: isSystemEquation },
    { expr: 'a*x + b*y = c | x = (c - b*y)/a', when: isSystemEquation },
    { expr: 'a*x + b*y = c | y = (c - a*x)/b', when: isSystemEquation },
  ],
  logarithms: [
    { expr: 'log[a](b) + log[a](c) = log[a](b * c)' },
    { expr: 'log[a](b) - log[a](c) = log[a](b/c)' },
    { expr: 'a^(1/n) = √[n](a)' },
    { expr: 'sqrt(x) = x^(1/2)' },
    { expr: 'a^(m) * a^(n) = a^(m+n)' },
    { expr: 'a^(m) / a^(n) = a^(m-n)' },
  ],
  trigonometry: [
    { expr: 'sin^(2)(a) + cos^(2)(a) = 1' },
    { expr: 'tan(a) = sin(a)/cos(a)' },
    { expr: 'sin(30°) = 1/2 | cos(60°) = 1/2' },
    { expr: 'sin(45°) = cos(45°) = sqrt(2)/2' },
    { expr: 'tan(45°) = 1' },
    { expr: 'sin(-a) = -sin(a) | cos(-a) = cos(a)' },
    { expr: 'sin(a + 360°·k) = sin(a)' },
    { expr: 'cos(a + 360°·k) = cos(a)' },
  ],
};

export interface GetFormulasOptions {
  /** Тир задания (1–7). Для арифметики: подсказка — только формулы, релевантные данному тиру. */
  difficulty?: number;
}

/**
 * Возвращает только те формулы подсказки, которые относятся к текущему примеру (вопросу).
 * Арифметика: по тиру — только релевантные формулы (тир 1: %; 2: корни и степени; 3: дроби один знаменатель; 4: разные знаменатели; 5: корни+дроби; 6: многоэтажные дроби; 7: телескопирование).
 * Остальные навыки: фильтр по when(); если ничего не подошло — все формулы навыка.
 */
export function getFormulasForQuestion(question: string, skill: SkillKey, options?: GetFormulasOptions): Array<{ expr: string }> {
  const difficulty = options?.difficulty;

  if (skill === 'arithmetic') {
    if (difficulty === 1 && /%/.test(question)) return [FORMULA_PERCENT];
    if (difficulty === 2) return ARITHMETIC_TIER2_FORMULAS;
    if (difficulty === 3) return ARITHMETIC_TIER3_FORMULAS;
    if (difficulty === 4) return ARITHMETIC_TIER4_FORMULAS;
    if (difficulty === 5) return ARITHMETIC_TIER5_FORMULAS;
    if (difficulty === 6) return ARITHMETIC_TIER6_FORMULAS;
    if (difficulty === 7) return ARITHMETIC_TIER7_FORMULAS;
    return [];
  }

  const list = FORMULAS_BY_SKILL[skill] ?? [];
  const filtered = list.filter((f) => !f.when || f.when(question)).map(({ expr }) => ({ expr }));
  return filtered.length > 0 ? filtered : list.map(({ expr }) => ({ expr }));
}
