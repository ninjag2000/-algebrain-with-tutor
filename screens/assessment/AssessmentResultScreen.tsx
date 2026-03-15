import React, { useMemo } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import BrainIcon from '../../components/icons/BrainIcon';
import type { AssessmentResult, SkillKey } from './types';
import type { StudyPlanDay } from './assessmentPlan';

export type { StudyPlanDay };

interface AssessmentResultScreenProps {
  result: AssessmentResult | null;
  onDone: () => void;
  onOpenPaywall: () => void;
  onStartPlan?: (plan: StudyPlanDay[]) => void;
}

const SKILL_ORDER: SkillKey[] = ['arithmetic', 'equations', 'logarithms', 'trigonometry'];
const TOPICS_BY_SKILL: Record<SkillKey, string[]> = {
  arithmetic: [
    'Fractions', 'Arithmetic', 'Adding Fractions', 'Multiplying Fractions', 'Decimal Arithmetic',
    'Like Terms', 'Word Problems', 'Order of Operations',
  ],
  equations: [
    'Linear Equations', 'One-Step Equations', 'Two-Step Equations', 'Simple Equations',
    'Expressions', 'Distributive Property', 'Inequalities', 'Substitution',
    'Quadratics', 'Solving x² = k', 'Factoring Quadratics', 'Quadratic Formula',
  ],
  logarithms: [
    'Logarithms', 'Exponent Equations', 'Log Basics', 'Powers & Exponents', 'Fractional Exponents',
    'Square Roots', 'Cube Roots', 'Simplifying Radicals', 'Powers & Radicals',
  ],
  trigonometry: [
    'Sine & Cosine', 'Special Angles', 'Trig Identities', 'Right Triangle Trig', 'Unit Circle',
  ],
};
const DURATIONS = ['5 min', '10 min', '10 min', '10 min', '15 min', '15 min', '15 min'];

function getStatusKey(progress: number): string {
  if (progress > 80) return 'assessment.result_skill_strong';
  if (progress > 60) return 'assessment.result_skill_improving';
  return 'assessment.result_skill_focus';
}


const AssessmentResultScreen: React.FC<AssessmentResultScreenProps> = ({ result, onDone, onOpenPaywall, onStartPlan }) => {
  const { t } = useLocalization();

  const { algebrainIQ, iqProgress, skills, levelLabel, studyPlan } = useMemo(() => {
    const fallback = {
      algebrainIQ: 118,
      iqProgress: 0.6,
      skills: [
        { name: t('assessment.skill_arithmetic'), progress: 91, status: t('assessment.result_skill_strong') },
        { name: t('assessment.skill_equations'), progress: 68, status: t('assessment.result_skill_improving') },
        { name: t('assessment.skill_logarithms'), progress: 50, status: t('assessment.result_skill_focus') },
        { name: t('assessment.skill_trigonometry'), progress: 50, status: t('assessment.result_skill_focus') },
      ],
      levelLabel: t('assessment.result_level_advanced'),
      studyPlan: [
        { day: 1, topic: 'Linear Equations', duration: '5 min' },
        { day: 2, topic: 'Quadratic Basics', duration: '10 min' },
        { day: 3, topic: 'Graph Interpretation', duration: '10 min' },
        { day: 4, topic: 'Fractions', duration: '10 min' },
        { day: 5, topic: 'Powers & Radicals', duration: '15 min' },
        { day: 6, topic: 'Simple Equations', duration: '15 min' },
        { day: 7, topic: 'Quadratic & Roots', duration: '15 min' },
      ],
    };
    if (!result?.steps?.length) return fallback;

    const steps = result.steps;
    const correctCount = steps.filter(s => s.correct).length;
    const maxLevel = Math.max(...steps.map(s => s.level), 1);
    const algebrainIQ = Math.round(Math.min(130, Math.max(80, 80 + 5 * correctCount + 5 * (maxLevel - 1))));
    const iqProgress = (algebrainIQ - 80) / 50;

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

    const skillNames: Record<SkillKey, string> = {
      arithmetic: t('assessment.skill_arithmetic'),
      equations: t('assessment.skill_equations'),
      logarithms: t('assessment.skill_logarithms'),
      trigonometry: t('assessment.skill_trigonometry'),
    };
    const skills = SKILL_ORDER.map(skill => {
      const { correct, total } = bySkill[skill];
      const progress = total > 0 ? Math.round((correct / total) * 100) : 50;
      const status = t(getStatusKey(progress));
      return { name: skillNames[skill], progress, status };
    });

    const levelLabel = t('assessment.result_level_advanced');
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
    const studyPlan = dayToSkill.map((skill, i) => {
      const topics = TOPICS_BY_SKILL[skill];
      const idx = usedBySkill[skill] % topics.length;
      usedBySkill[skill] += 1;
      return { day: i + 1, topic: topics[idx], duration: DURATIONS[i] };
    });

    return { algebrainIQ, iqProgress, skills, levelLabel, studyPlan };
  }, [result, t]);
  
  const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;

    return (
      <svg className="w-full h-full" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="resultRingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#5B8CFF" />
          </linearGradient>
        </defs>
        <circle className="text-white/10" strokeWidth="12" stroke="currentColor" fill="transparent" r={radius} cx="70" cy="70" />
        <circle strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="url(#resultRingGradient)" fill="transparent" r={radius} cx="70" cy="70" transform="rotate(-90 70 70)" className="transition-all duration-1000 ease-out delay-500" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-white overflow-hidden">
      <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
          <div className="w-10"></div>{/* Placeholder for back button */}
          <h1 className="text-xl font-bold text-center truncate min-w-0">{t('assessment.result_title')}</h1>
          <div className="w-10"></div>{/* Placeholder for right button */}
        </div>
        <div className="min-h-3" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-6 pt-safe">
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <div className="relative w-40 h-40 mx-auto mb-4">
            <ProgressRing progress={iqProgress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white">{algebrainIQ}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{t('assessment.result_title')}</h1>
          <p className="text-base text-gray-400">{t('assessment.result_level')}: <span className="font-semibold text-purple-400">{levelLabel}</span></p>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          {/* Skill Analysis */}
          <div className="bg-[#121826] p-5 rounded-2xl border border-white/10">
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-4">{t('assessment.result_skill_analysis')}</h2>
            <div className="space-y-4">
              {skills.map((skill, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="font-bold text-base text-white">{skill.name}</span>
                    <span className={`text-xs font-semibold ${skill.progress > 80 ? 'text-green-400' : skill.progress > 60 ? 'text-yellow-400' : 'text-red-400'}`}>{skill.status}</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2.5 border border-white/5"><div className="bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] h-full rounded-full" style={{ width: `${skill.progress}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Study Plan */}
          <div className="bg-[#121826] p-5 rounded-2xl border border-white/10">
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-4">{t('assessment.result_study_plan')}</h2>
            <div className="space-y-3">
              {studyPlan.map(day => (
                <div key={day.day} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-xs font-bold text-gray-400 mr-4">{t('assessment.result_study_plan_day')} {day.day}</span>
                    <span className="font-semibold text-white">{day.topic}</span>
                  </div>
                  <span className="text-xs text-gray-500">{day.duration}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onStartPlan?.(studyPlan)}
              className="w-full mt-4 bg-gradient-to-r from-[#5B8CFF] to-[#A78BFA] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest active:scale-[0.98] transition-transform"
            >
              {t('assessment.result_start_plan')}
            </button>
          </div>

          {/* Premium Upsell */}
          <div className="bg-gradient-to-br from-[#1A1D24] to-[#121826] border border-dashed border-purple-400/30 rounded-2xl p-5 space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-purple-400">
                <BrainIcon className="w-5 h-5"/>
                <h3 className="font-semibold text-sm uppercase tracking-wider">{t('assessment.result_premium_title')}</h3>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
                <li>• {t('assessment.result_premium_feature1')}</li>
                <li>• {t('assessment.result_premium_feature2')}</li>
                <li>• {t('assessment.result_premium_feature3')}</li>
            </ul>
            <button onClick={onOpenPaywall} className="w-full bg-white/10 text-white/80 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/20 active:scale-95 transition-transform">{t('assessment.result_premium_cta')}</button>
          </div>
        </div>
      </div>
      
      <div className="p-4 pb-safe border-t border-white/10">
        <button onClick={onDone} className="w-full bg-white/10 text-white font-bold py-4 rounded-xl text-lg">{t('assessment.done')}</button>
      </div>
    </div>
  );
};

export default AssessmentResultScreen;
