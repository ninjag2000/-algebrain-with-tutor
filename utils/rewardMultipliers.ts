/** Множитель за тир: тир 1 = 0.5, тир 2 = 0.7, тир 3 = 1.2, тир 4 = 1.5, тир 5 = 2, тир 6 = 2.5, тир 7 = 3. */
export function getTierMultiplier(tier: number): number {
  const map: Record<number, number> = {
    1: 0.5,
    2: 0.7,
    3: 1.2,
    4: 1.5,
    5: 2,
    6: 2.5,
    7: 3,
  };
  return map[tier] ?? 1;
}

/** Множитель за подсказку: если использовалась — 0.5, иначе 1. (для челленджа, где нет пошагового раскрытия.) */
export function getHintMultiplier(hintUsed: boolean): number {
  return hintUsed ? 0.5 : 1;
}

/** Множитель за шаги решения в практике: каждый открытый шаг даёт 0.75 (0 шагов = 1, 1 шаг = 0.75, 2 шага = 0.5625, …). */
export function getHintMultiplierFromSteps(revealedStepCount: number): number {
  if (revealedStepCount <= 0) return 1;
  return Math.pow(0.75, revealedStepCount);
}

/** Базовый XP за один правильный ответ в практике. */
export const BASE_XP_PRACTICE = 20;

/** Базовые очки мозга за один правильный ответ в практике. */
export const BASE_BP_PRACTICE = 10;

export interface ChallengeAnswerWithHint {
  question: { difficulty: number };
  isCorrect: boolean;
  hintUsed?: boolean;
}

/**
 * Считает награду за испытание: XP и BP с учётом тира и подсказки по каждому ответу.
 * baseXp и baseBp — награда «за одно задание» (например reward/total, brainPoints/total).
 */
export function computeChallengeRewards(
  answers: ChallengeAnswerWithHint[],
  baseXpPerQuestion: number,
  baseBpPerQuestion: number,
  isPro: boolean
): { xpGained: number; bpGained: number } {
  let xpSum = 0;
  let bpSum = 0;
  for (const a of answers) {
    if (!a.isCorrect) continue;
    const tier = getTierMultiplier(a.question.difficulty);
    const hint = getHintMultiplier(!!a.hintUsed);
    xpSum += baseXpPerQuestion * tier * hint;
    bpSum += baseBpPerQuestion * tier * hint;
  }
  const bpGained = Math.round(bpSum * (isPro ? 2 : 1));
  return { xpGained: Math.round(xpSum), bpGained };
}
