import React from 'react';

export const GodseyeLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M28 22 H72" stroke="#4DA3FF" strokeWidth="2.5" />
    <circle cx="28" cy="22" r="2" fill="#4DA3FF" />
    <circle cx="72" cy="22" r="2" fill="#4DA3FF" />
    <path d="M50 22 V30" stroke="#4DA3FF" />
    <path d="M50 30 C32 38 32 54 50 62 C68 70 68 84 50 92" stroke="#43E6C5" strokeWidth="1.8" />
    <path d="M50 30 C68 38 68 54 50 62 C32 70 32 84 50 92" stroke="#3B82C4" strokeWidth="1.8" strokeDasharray="3 2" />
    <line x1="38" y1="45" x2="62" y2="45" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <line x1="38" y1="77" x2="62" y2="77" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <line x1="44" y1="62" x2="56" y2="62" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <circle cx="50" cy="62" r="2.2" fill="#E8A33D" />
    <circle cx="44" cy="45" r="1.5" fill="#4DA3FF" />
    <circle cx="56" cy="45" r="1.5" fill="#4DA3FF" />
    <path d="M 20 88 Q 50 78 80 88" stroke="#43E6C5" strokeWidth="1.2" />
    <path d="M 20 94 Q 50 84 80 94" stroke="#43E6C5" strokeWidth="1.2" />
    <line x1="50" y1="83" x2="50" y2="94" stroke="#43E6C5" strokeWidth="0.8" />
  </svg>
);
