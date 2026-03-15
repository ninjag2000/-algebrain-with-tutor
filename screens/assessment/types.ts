/** Skills actually tested in the assessment. Quadratics → equations, roots/powers → logarithms. */
export type SkillKey = 'arithmetic' | 'equations' | 'logarithms' | 'trigonometry';

export interface AssessmentStepResult {
  level: number;
  correct: boolean;
  skill: SkillKey;
}

export interface AssessmentResult {
  steps: AssessmentStepResult[];
}

export interface SkillStats {
  arithmetic: { correct: number; total: number };
  equations: { correct: number; total: number };
  logarithms: { correct: number; total: number };
  trigonometry: { correct: number; total: number };
}

export const EMPTY_SKILL_STATS: SkillStats = {
  arithmetic: { correct: 0, total: 0 },
  equations: { correct: 0, total: 0 },
  logarithms: { correct: 0, total: 0 },
  trigonometry: { correct: 0, total: 0 },
};

/** Один ответ по навыку (для подсчёта за последние 30 дней). */
export interface SkillHistoryEntry {
  t: number;
  skill: SkillKey;
  correct: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 2000;

/** Агрегирует историю за последние windowMs в SkillStats. */
export function getSkillStatsFromHistory(entries: SkillHistoryEntry[], windowMs: number = THIRTY_DAYS_MS): SkillStats {
  const cutoff = Date.now() - windowMs;
  const recent = entries.filter(e => e.t >= cutoff);
  const out: SkillStats = { ...EMPTY_SKILL_STATS };
  const keys: SkillKey[] = ['arithmetic', 'equations', 'logarithms', 'trigonometry'];
  const norm = (s: string): SkillKey => (s === 'quadratics_roots' ? 'equations' : s as SkillKey);
  keys.forEach(skill => {
    const bySkill = recent.filter(e => norm(e.skill) === skill);
    out[skill] = {
      correct: bySkill.filter(e => e.correct).length,
      total: bySkill.length,
    };
  });
  return out;
}

/** Обрезает массив до последних 30 дней и ограничивает размер. */
export function pruneSkillHistory(entries: SkillHistoryEntry[]): SkillHistoryEntry[] {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return entries.filter(e => e.t >= cutoff).slice(-MAX_HISTORY);
}
