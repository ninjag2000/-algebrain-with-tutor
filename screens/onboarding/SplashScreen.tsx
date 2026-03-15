
import React, { useEffect } from 'react';
import { TutorAvatarIcon } from '../../components/icons/TutorAvatarIcon';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex flex-col justify-center items-center h-screen w-screen bg-[#0F1115] text-[#E6EAF2] overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex justify-center">
            {/* No content needed here for splash screen, but keep structure for pt-safe */}
        </header>
        <div className="flex-1 flex flex-col justify-center items-center">
             <h1 className="text-5xl font-black mb-4 tracking-wide">AlgeBrain</h1>
        </div>
        <div className="w-full flex justify-end">
            <TutorAvatarIcon className="w-32 h-32 transform translate-x-4 translate-y-4 opacity-50" />
        </div>
    </div>
  );
};

export default SplashScreen;
