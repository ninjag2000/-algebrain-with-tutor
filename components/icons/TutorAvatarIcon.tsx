import React from 'react';

export const TutorAvatarIcon: React.FC<{ className?: string; variant?: 'mascot' | 'tutor' }> = ({ className, variant = 'mascot' }) => {
  const src = variant === 'tutor' ? '/tutor-avatar.png' : '/mascot.png';
  const alt = variant === 'tutor' ? 'AI Tutor' : 'AlgeBrain mascot';
  const isMascot = variant === 'mascot';
  return (
    <span className={isMascot ? 'inline-block' : undefined}>
      <img
        src={src}
        alt={alt}
        className={className}
      />
    </span>
  );
};
