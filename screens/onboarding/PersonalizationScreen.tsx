
import React, { useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';
import { PersonalizationData } from '../../types';

interface PersonalizationScreenProps {
  onComplete: (data: PersonalizationData) => void;
}

const PersonalizationScreen: React.FC<PersonalizationScreenProps> = ({ onComplete }) => {
  const [selection, setSelection] = useState<string | null>(null);
  const [wantsExplanations, setWantsExplanations] = useState(true);

  const choices = [
    { key: 'middle', label: '🎯 Middle School' },
    { key: 'high', label: '🎓 High School' },
    { key: 'advanced', label: '🚀 Advanced Math' },
  ];

  const handleComplete = () => {
    onComplete({
      level: selection as 'middle' | 'high' | 'advanced' | null,
      wantsExplanations,
    });
  };

  return (
    <div
      className="flex flex-col h-screen w-screen text-[#E6EAF2] p-6 overflow-hidden relative justify-end"
      style={{
        background: 'linear-gradient(180deg, #0B0F1A 0%, #0F1420 45%, #11162A 100%)',
      }}
    >
      {/* Subtle neural particles (CSS-only) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(88, 101, 242, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)' }} />
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full opacity-40 blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(88, 101, 242, 0.35) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)' }} />
      </div>

      <header className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex justify-center">
        {/* Keep structure for pt-safe */}
      </header>

      {/* Mascot area with soft radial glow + subtle float */}
      <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-center pointer-events-none pt-safe" style={{ alignItems: 'flex-start', paddingTop: 'max(env(safe-area-inset-top), 10%)' }}>
        <div className="flex items-center justify-center pt-[8%]" style={{ minHeight: '38%' }}>
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full opacity-60 blur-3xl scale-150"
              style={{ background: 'radial-gradient(circle, rgba(88, 101, 242, 0.25) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%)' }}
            />
            <div className="relative animate-[float_6s_ease-in-out_infinite]">
              <TutorAvatarIcon className="w-[22.08rem] h-[22.08rem] sm:w-[27.6rem] sm:h-[27.6rem] opacity-95 drop-shadow-[0_0_30px_rgba(88,101,242,0.2)] animate-in fade-in duration-500" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <div className="relative z-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1
          className="text-4xl font-black tracking-tight mb-2"
          style={{
            background: 'linear-gradient(135deg, #E0E7FF 0%, #A5B4FC 40%, #818CF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 40px rgba(129, 140, 248, 0.25)',
            filter: 'drop-shadow(0 0 24px rgba(88, 101, 242, 0.2))',
          }}
        >
          Customize Your Learning AI
        </h1>
        <p className="text-sm text-white/60 mb-6 tracking-wide">Step-by-step solutions powered by AI</p>

        {/* Glass capsules for level chips */}
        <div className="flex flex-wrap justify-center gap-3 my-8">
          {choices.map((choice) => (
            <button
              key={choice.key}
              onClick={() => setSelection(choice.key)}
              className={`
                px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300
                backdrop-blur-xl border
                ${selection === choice.key
                  ? 'bg-white/15 border-white/30 shadow-[0_0_24px_rgba(88,101,242,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/15'
                }
              `}
            >
              {choice.label}
            </button>
          ))}
        </div>

        {/* Glass toggle card */}
        <div
          className="flex items-center justify-center rounded-2xl p-4 my-8 max-w-sm mx-auto border border-white/10 backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-sm font-medium mr-4 text-white/90">I want step-by-step explanations</span>
          <button
            onClick={() => setWantsExplanations(!wantsExplanations)}
            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-all duration-300 flex-shrink-0 ${
              wantsExplanations
                ? 'bg-emerald-500/90 shadow-[0_0_20px_rgba(52,211,153,0.45),0_0_40px_rgba(52,211,153,0.2)]'
                : 'bg-white/10 border border-white/10'
            }`}
          >
            <span
              className={`inline-block w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${
                wantsExplanations ? 'translate-x-6' : 'translate-x-1'
              }`}
              style={wantsExplanations ? { boxShadow: '0 0 12px rgba(255,255,255,0.5)' } : undefined}
            />
          </button>
        </div>

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            onClick={handleComplete}
            className="w-full font-bold py-4 px-4 rounded-xl transition-all duration-300 active:scale-[0.98] border border-white/10"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
              boxShadow: '0 4px 24px rgba(59, 130, 246, 0.4), 0 0 40px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-white drop-shadow-sm">Enter AlgeBrain →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationScreen;
