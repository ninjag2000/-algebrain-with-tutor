
import React from 'react';

const OwlIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 135c-33.137 0-60-26.863-60-60S41.863 15 75 15s60 26.863 60 60-26.863 60-60 60z" fill="#7B61FF"/>
    <path d="M75 125c-27.614 0-50-22.386-50-50S47.386 25 75 25s50 22.386 50 50-22.386 50-50 50z" fill="#4C3A9A"/>
    <path d="M125 75c0 27.614-22.386 50-50 50V25c27.614 0 50 22.386 50 50z" fill="#3B2D78"/>
    <circle cx="55" cy="70" r="20" fill="#FFF"/>
    <circle cx="55" cy="70" r="10" fill="#000"/>
    <circle cx="55" cy="70" r="4" fill="#FFF"/>
    <circle cx="95" cy="70" r="20" fill="#FFF"/>
    <circle cx="95" cy="70" r="10" fill="#000"/>
    <circle cx="95" cy="70" r="4" fill="#FFF"/>
    <path d="M57 60h-4a3 3 0 00-3 3v4a3 3 0 003 3h4a3 3 0 003-3v-4a3 3 0 00-3-3zM100 60h-8a3 3 0 00-3 3v4a3 3 0 003 3h8a3 3 0 003-3v-4a3 3 0 00-3-3z" fill="#2C215A"/>
    <path d="M75 90l-5 5a3 3 0 000 4.243l5 5a3 3 0 004.243 0l5-5a3 3 0 000-4.243l-5-5a3 3 0 00-4.243 0z" fill="#FFC700"/>
  </svg>
);

export default OwlIcon;
