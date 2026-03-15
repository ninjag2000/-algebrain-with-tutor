import React from 'react';

const CrystalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <defs>
            <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8A2BE2" />
                <stop offset="100%" stopColor="#4A00E0" />
            </linearGradient>
            <linearGradient id="crystalShineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
        </defs>
        <path d="M12 2L2 7l10 15L22 7l-10-5z" fill="url(#crystalGradient)" stroke="none" />
        <path d="M2 7l10 15V7L2 7z" fill="rgba(0,0,0,0.2)" stroke="none" />
        <path d="M12 2l10 5-10 15V2z" fill="rgba(255,255,255,0.2)" stroke="none" />
        <path d="M7 9.5L12 12l5-2.5" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.5" />
    </svg>
);

export default CrystalIcon;