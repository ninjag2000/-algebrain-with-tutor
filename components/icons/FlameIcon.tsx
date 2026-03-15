import React from 'react';

const FlameIcon: React.FC<{ className?: string }> = ({ className }) => (
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
            <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FF8C00" />
            </linearGradient>
        </defs>
        <path d="M12 2c-4 4-4 8-2 10 2 2 4 2 6 0 2-2 2-6 0-10-2-2-4-2-4 0z" fill="url(#flameGradient)" stroke="none" />
        <path d="M12 12c-2 2-2 4 0 6 2 2 4 2 6 0 2-2 2-4 0-6" fill="url(#flameGradient)" stroke="none" />
    </svg>
);

export default FlameIcon;