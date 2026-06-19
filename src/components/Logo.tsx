'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  showText?: boolean;
}

export default function Logo({ className, size = 'md', showText = false }: LogoProps) {
  const sizeMap = {
    xs: 18,
    sm: 24,
    md: 32,
    lg: 48,
  };
  
  const widthHeight = typeof size === 'number' ? size : sizeMap[size] || 32;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className={className}>
      <svg
        width={widthHeight}
        height={widthHeight}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Rounded square border with bottom-left gap */}
        <path
          d="M 25 120 
             A 1 1 0 0 1 25 120
             V 45 
             A 20 20 0 0 1 45 25 
             H 155 
             A 20 20 0 0 1 175 45 
             V 155 
             A 20 20 0 0 1 155 175 
             H 80"
          stroke="#5EEAD4"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Stylized P inside */}
        <path
          d="M 75 60
             H 120
             A 25 25 0 0 1 145 85
             A 25 25 0 0 1 120 110
             H 75"
          stroke="#5EEAD4"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 75 60 V 140"
          stroke="#5EEAD4"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Three ascending diagonal arrows (45 deg) emerging from bottom-left */}
        {/* Arrow 1 (Topmost/rightmost) */}
        <path
          d="M 35 165 L 115 85"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 95 85 H 115 V 105"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Arrow 2 (Middle) */}
        <path
          d="M 20 180 L 90 110"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 70 110 H 90 V 130"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Arrow 3 (Bottommost/leftmost) */}
        <path
          d="M 5 195 L 65 135"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 45 135 H 65 V 155"
          stroke="#5EEAD4"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center' }}>
          Praxis<span style={{ color: '#5EEAD4' }}>One</span>
        </span>
      )}
    </div>
  );
}
