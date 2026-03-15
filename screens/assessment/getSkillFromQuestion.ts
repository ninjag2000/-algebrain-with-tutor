import type { SkillKey } from './types';

/** Определяет навык по тексту задания. Квадратные уравнения → equations, корни/степени → logarithms. */
export function getSkillFromQuestion(question: string): SkillKey {
  const q = question;
  if (/sin\(|cos\(|tan\(/.test(q)) return 'trigonometry';
  if (/log\[/.test(q)) return 'logarithms';
  if (/\d+\^\(x\)|x\^\(x\)/.test(q)) return 'logarithms';
  if (/sqrt|√|³√|cbrt\(|root\(\d+\)/.test(q)) return 'logarithms';
  if (/x\^\(2\)|x²|quadratic|system\{/.test(q) || (/=/.test(q) && /x\^\(|\^\(2\)/.test(q))) return 'equations';
  if (/=/.test(q) && /[xy]/.test(q)) return 'equations';
  if (/frac/.test(q)) return 'arithmetic';
  if (/%/.test(q)) return 'arithmetic';
  if (/x\s*[\+\-÷\/=]|x[\+\-\)]|\d+x|^\s*\d+[\s×÷+\-]/.test(q)) return 'equations';
  if (/^\s*[\d\s×÷+\-=?*%]+$/.test(q) || /[\d]+\s*[\+\-×÷*]\s*[\d%]+/.test(q)) return 'arithmetic';
  if (/x\^\(|\^\(|x³/.test(q)) return 'logarithms';
  return 'equations';
}
