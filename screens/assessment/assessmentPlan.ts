import type { AssessmentResult, SkillKey } from './types';

export interface StudyPlanDay {
  day: number;
  topic: string;
  duration: string;
}

const SKILL_ORDER: SkillKey[] = ['arithmetic', 'equations', 'logarithms', 'trigonometry'];
const TOPICS_BY_SKILL: Record<SkillKey, string[]> = {
  arithmetic: [
    'Fractions', 'Order of Operations', 'Adding & Subtracting Fractions', 'Multiplying & Dividing Fractions',
    'Decimal Arithmetic', 'Like Terms',
  ],
  equations: [
    'Linear Equations', 'One-Step Equations', 'Two-Step Equations', 'Equations with Brackets',
    'Equations with Fractions', 'Both Sides', 'Absolute Value', 'Simple Expressions',
    'Quadratics & Factoring', 'Solving x² = k', 'Non-Monic Quadratics', 'Rational Equations',
  ],
  logarithms: [
    'Logarithms', 'Exponent Equations', 'Log Basics', 'Powers & Exponents', 'Fractional Exponents',
    'Square Roots', 'Radical Equations', 'Cube Roots', 'Simplifying Radicals',
  ],
  trigonometry: [
    'Sine & Cosine', 'Special Angles', 'Trig Identities', 'Right Triangle Trig', 'Unit Circle',
  ],
};
const DURATIONS = ['5 min', '10 min', '10 min', '10 min', '15 min', '15 min', '15 min'];

export function getStudyPlanFromResult(result: AssessmentResult): StudyPlanDay[] {
  const steps = result.steps;
  const bySkill: Record<SkillKey, { correct: number; total: number }> = {
    arithmetic: { correct: 0, total: 0 },
    equations: { correct: 0, total: 0 },
    logarithms: { correct: 0, total: 0 },
    trigonometry: { correct: 0, total: 0 },
  };
  const normSkill = (sk: string): SkillKey => (sk === 'quadratics_roots' ? 'equations' : sk as SkillKey);
  steps.forEach(s => {
    const skill = normSkill(s.skill as string);
    if (bySkill[skill]) {
      bySkill[skill].total += 1;
      if (s.correct) bySkill[skill].correct += 1;
    }
  });
  const skillsByWeakness = [...SKILL_ORDER].sort((a, b) => {
    const rateA = bySkill[a].total > 0 ? bySkill[a].correct / bySkill[a].total : 1;
    const rateB = bySkill[b].total > 0 ? bySkill[b].correct / bySkill[b].total : 1;
    return rateA - rateB;
  });
  const weak = skillsByWeakness[0]!;
  const mid1 = skillsByWeakness[1]!;
  const mid2 = skillsByWeakness[2]!;
  const strong = skillsByWeakness[3]!;
  const dayToSkill: SkillKey[] = [weak, weak, mid1, mid2, strong, strong, strong];
  const usedBySkill: Record<SkillKey, number> = { arithmetic: 0, equations: 0, logarithms: 0, trigonometry: 0 };
  return dayToSkill.map((skill, i) => {
    const topics = TOPICS_BY_SKILL[skill];
    const idx = usedBySkill[skill] % topics.length;
    usedBySkill[skill] += 1;
    return { day: i + 1, topic: topics[idx], duration: DURATIONS[i] };
  });
}
