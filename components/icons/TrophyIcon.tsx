import React from 'react';

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.572l-7.5-7.428-7.5 7.428m15 0A2.25 2.25 0 0121 14.82v5.68a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 20.5v-5.68a2.25 2.25 0 011.5-2.248" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 21h-6a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 21v-1a2 2 0 012-2h0a2 2 0 012 2v1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7h7" />
    </svg>
);

export default TrophyIcon;