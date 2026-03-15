import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';

interface PaywallScreenProps {
  onComplete: () => void;
  personalization: unknown;
}

const ELECTRIC_BLUE = '#5B8CFF';
const NEURAL_VIOLET = '#8A7CFF';
const GLASS_BG = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

const PaywallScreen: React.FC<PaywallScreenProps> = ({ onComplete }) => {
  const { t } = useLocalization();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  const features = [
    { key: 'pro_feature1', icon: 'steps' },
    { key: 'pro_feature2', icon: 'ai' },
    { key: 'pro_feature3', icon: 'olympiad' },
    { key: 'pro_feature4', icon: 'xp' },
  ] as const;

  return (
    <>
      <style>{`
        @keyframes paywall-breathing {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.95; }
        }
        @keyframes paywall-cta-pulse {
          0%, 100% { box-shadow: 0 10px 30px rgba(91,140,255,0.35); }
          50% { box-shadow: 0 10px 40px rgba(91,140,255,0.45); }
        }
        @keyframes paywall-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .paywall-mascot-breathe { animation: paywall-breathing 4s ease-in-out infinite; }
        .paywall-cta-glow { animation: paywall-cta-pulse 3s ease-in-out infinite; }
      `}</style>
      <div
        className="fixed inset-0 z-[200] flex flex-col overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #0B0F1A 0%, #12182B 100%)',
          paddingTop: 20,
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
        }}
      >
        {/* Hero */}
        <div className="flex-shrink-0 flex flex-col items-center px-6 pt-8 pb-6">
          <div
            className="paywall-mascot-breathe relative w-36 h-36 rounded-full overflow-visible flex items-center justify-center mb-5"
            style={{
              background: `radial-gradient(circle, ${ELECTRIC_BLUE}30 0%, ${ELECTRIC_BLUE}22 35%, ${ELECTRIC_BLUE}14 65%, ${ELECTRIC_BLUE}08 85%, transparent 100%)`,
              boxShadow: `0 0 56px ${ELECTRIC_BLUE}40`,
            }}
          >
            <TutorAvatarIcon className="w-28 h-28 object-cover" variant="mascot" />
          </div>
          <h1 className="text-xl font-black text-white text-center tracking-tight leading-tight max-w-[280px]">
            {t('paywall.hero_headline')}
          </h1>
          <p className="text-sm text-white/60 text-center mt-2 max-w-[300px] leading-snug">
            {t('paywall.hero_subheadline')}
          </p>
        </div>

        {/* Value cards */}
        <div className="flex-shrink-0 px-4 space-y-2">
          {features.map(({ key, icon }, i) => (
            <div
              key={key}
              className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-300"
              style={{
                background: GLASS_BG,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${GLASS_BORDER}`,
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                animation: 'paywall-fade-in 0.5s ease-out both',
                animationDelay: `${150 * (i + 1)}ms`,
              }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${ELECTRIC_BLUE}20 0%, ${NEURAL_VIOLET}20 100%)`, border: `1px solid ${GLASS_BORDER}` }}
              >
                {icon === 'steps' && <StepsIcon />}
                {icon === 'ai' && <AIIcon />}
                {icon === 'olympiad' && <OlympiadIcon />}
                {icon === 'xp' && <XPIcon />}
              </div>
              <p className="text-sm font-semibold text-white/95 leading-tight">
                {t(`paywall.${key}`)}
              </p>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <p className="flex-shrink-0 text-[11px] text-white/40 text-center mt-4 px-4">
          {t('paywall.social_proof')}
        </p>

        {/* Pricing */}
        <div className="flex-shrink-0 px-4 mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setSelectedPlan('yearly')}
            className="relative w-full text-left rounded-2xl px-4 pt-4 pb-3 transition-all duration-300"
            style={{
              background: selectedPlan === 'yearly' ? `${ELECTRIC_BLUE}12` : GLASS_BG,
              border: `2px solid ${selectedPlan === 'yearly' ? ELECTRIC_BLUE : GLASS_BORDER}`,
              boxShadow: selectedPlan === 'yearly' ? `0 0 24px ${ELECTRIC_BLUE}30` : 'none',
              backdropFilter: 'blur(20px)',
            }}
          >
            <span
              className="absolute top-2 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: `linear-gradient(135deg, ${ELECTRIC_BLUE}, ${NEURAL_VIOLET})` }}
            >
              {t('paywall.save_badge')}
            </span>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-sm">{t('paywall.yearly_title')}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{t('paywall.yearly_monthly_equivalent')}</p>
              </div>
              <p className="font-black text-white text-base">{t('paywall.yearly_price')}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className="relative w-full text-left rounded-2xl px-4 py-3 transition-all duration-300"
            style={{
              background: selectedPlan === 'monthly' ? `${ELECTRIC_BLUE}12` : GLASS_BG,
              border: `2px solid ${selectedPlan === 'monthly' ? ELECTRIC_BLUE : GLASS_BORDER}`,
              boxShadow: selectedPlan === 'monthly' ? `0 0 24px ${ELECTRIC_BLUE}30` : 'none',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-white text-sm">{t('paywall.monthly_title')}</p>
              <p className="font-black text-white text-base">{t('paywall.monthly_price')}</p>
            </div>
          </button>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 px-4 mt-6">
          <button
            type="button"
            onClick={onComplete}
            className="paywall-cta-glow w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${ELECTRIC_BLUE} 0%, ${NEURAL_VIOLET} 100%)`,
            }}
          >
            {t('paywall.cta')}
          </button>
        </div>

        {/* Trust */}
        <div className="flex-shrink-0 mt-5 px-4 text-center">
          <p className="text-[10px] text-white/35 leading-relaxed">
            {t('paywall.trust_line')}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-white/40">
            <button type="button" onClick={onComplete} className="hover:underline">
              {t('paywall.restore')}
            </button>
            <span className="opacity-50">·</span>
            <button type="button" onClick={onComplete} className="hover:underline">
              {t('paywall.terms')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function StepsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ELECTRIC_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M7 10l5-5 5 5M7 14l5-5 5 5" />
    </svg>
  );
}
function AIIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NEURAL_VIOLET} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
function OlympiadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ELECTRIC_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15 8l6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-6z" />
    </svg>
  );
}
function XPIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NEURAL_VIOLET} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M9 9l3 3 3-3M9 15l3-3 3 3" />
    </svg>
  );
}

export default PaywallScreen;
