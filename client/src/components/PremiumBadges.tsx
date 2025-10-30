import React from "react";

// Ultra-Premium Metallic Badge Components - Original Luxury Designs
export const PlatinumBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="platinumMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="15%" stopColor="#E2E8F0" />
        <stop offset="35%" stopColor="#CBD5E1" />
        <stop offset="55%" stopColor="#94A3B8" />
        <stop offset="75%" stopColor="#64748B" />
        <stop offset="90%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <radialGradient id="platinumReflection" cx="35%" cy="25%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
        <stop offset="30%" stopColor="#F1F5F9" stopOpacity="0.7"/>
        <stop offset="60%" stopColor="#E2E8F0" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.1"/>
      </radialGradient>
      <filter id="platinumEmboss">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="2" dy="2" result="offset"/>
        <feFlood floodColor="#FFFFFF" floodOpacity="0.8"/>
        <feComposite in2="offset" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="platinumShadow">
        <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#1E293B" floodOpacity="0.4"/>
      </filter>
    </defs>
    
    <polygon points="70,15 110,35 125,70 110,105 70,125 30,105 15,70 30,35" 
             fill="url(#platinumMetal)" filter="url(#platinumShadow)" 
             stroke="#475569" strokeWidth="2"/>
    
    <polygon points="70,25 100,40 110,70 100,100 70,115 40,100 30,70 40,40" 
             fill="url(#platinumReflection)" opacity="0.8"/>
    
    <circle cx="70" cy="70" r="25" fill="#1E293B" opacity="0.9" filter="url(#platinumEmboss)"/>
    <path d="M70 50 L78 62 L90 60 L82 72 L90 84 L78 82 L70 94 L62 82 L50 84 L58 72 L50 60 L62 62 Z" 
          fill="#F8FAFC" opacity="0.95"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="900" letterSpacing="1px">PLATINUM</text>
  </svg>
);

export const GoldBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="15%" stopColor="#FEF3C7" />
        <stop offset="30%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#FBBF24" />
        <stop offset="70%" stopColor="#F59E0B" />
        <stop offset="85%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
      <radialGradient id="goldHighlight" cx="30%" cy="20%">
        <stop offset="0%" stopColor="#FFFBEB" stopOpacity="1"/>
        <stop offset="40%" stopColor="#FEF3C7" stopOpacity="0.8"/>
        <stop offset="80%" stopColor="#FBBF24" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#D97706" stopOpacity="0.1"/>
      </radialGradient>
      <filter id="goldBevel">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="1" dy="1" result="offset"/>
        <feFlood floodColor="#FFFBEB" floodOpacity="0.7"/>
        <feComposite in2="offset" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="goldShadow">
        <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#451A03" floodOpacity="0.5"/>
      </filter>
    </defs>
    
    <polygon points="70,10 105,25 125,60 105,95 70,110 35,95 15,60 35,25" 
             fill="url(#goldMetal)" filter="url(#goldShadow)" 
             stroke="#92400E" strokeWidth="3"/>
    
    <polygon points="70,20 95,30 110,60 95,90 70,100 45,90 30,60 45,30" 
             fill="url(#goldHighlight)" opacity="0.9" filter="url(#goldBevel)"/>
    
    <circle cx="70" cy="60" r="28" fill="#451A03" opacity="0.8"/>
    <circle cx="70" cy="60" r="23" fill="url(#goldMetal)" opacity="0.9"/>
    <path d="M70 42 L76 54 L88 54 L78 62 L82 74 L70 68 L58 74 L62 62 L52 54 L64 54 Z" 
          fill="#FFFBEB" opacity="0.95" filter="url(#goldBevel)"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="12" fill="#92400E" fontWeight="900" letterSpacing="2px">AURUM</text>
  </svg>
);

export const DiamondBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="diamondMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F0F23" />
        <stop offset="20%" stopColor="#1E1B4B" />
        <stop offset="40%" stopColor="#312E81" />
        <stop offset="60%" stopColor="#3730A3" />
        <stop offset="80%" stopColor="#312E81" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
      <radialGradient id="diamondCore" cx="35%" cy="25%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
        <stop offset="25%" stopColor="#F3F4F6" stopOpacity="0.9"/>
        <stop offset="50%" stopColor="#E5E7EB" stopOpacity="0.7"/>
        <stop offset="75%" stopColor="#D1D5DB" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.1"/>
      </radialGradient>
      <filter id="diamondRefraction">
        <feGaussianBlur stdDeviation="0.8"/>
        <feColorMatrix values="1 1 1 0 0  1 1 1 0 0  1 1 1 0 0  0 0 0 0.9 0"/>
      </filter>
      <filter id="diamondLuxury">
        <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#0F0F23" floodOpacity="0.6"/>
      </filter>
    </defs>
    
    <polygon points="70,15 95,30 125,45 105,70 125,95 95,110 70,125 45,110 15,95 35,70 15,45 45,30" 
             fill="url(#diamondMetal)" filter="url(#diamondLuxury)" 
             stroke="#3730A3" strokeWidth="2"/>
    
    <polygon points="70,25 90,35 110,50 95,70 110,90 90,105 70,115 50,105 30,90 45,70 30,50 50,35" 
             fill="url(#diamondCore)" opacity="0.8"/>
    
    <polygon points="70,35 85,45 95,60 85,75 70,85 55,75 45,60 55,45" 
             fill="#FFFFFF" opacity="0.7" filter="url(#diamondRefraction)"/>
    <polygon points="70,40 80,48 88,60 80,72 70,80 60,72 52,60 60,48" 
             fill="#FFFFFF" opacity="0.9"/>
    
    <path d="M55 50 L65 40" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" strokeLinecap="round"/>
    <path d="M85 65 L75 55" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" strokeLinecap="round"/>
    <circle cx="45" cy="55" r="1.5" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="95" cy="75" r="2" fill="#FFFFFF" opacity="0.7"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="10" fill="#8B5CF6" fontWeight="900" letterSpacing="1.5px">BRILLIANCE</text>
  </svg>
);

export const CrownBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="royalGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="15%" stopColor="#FEF3C7" />
        <stop offset="35%" stopColor="#FBBF24" />
        <stop offset="55%" stopColor="#F59E0B" />
        <stop offset="75%" stopColor="#D97706" />
        <stop offset="90%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
      <radialGradient id="rubyJewel" cx="50%" cy="30%">
        <stop offset="0%" stopColor="#FEE2E2" />
        <stop offset="30%" stopColor="#EF4444" />
        <stop offset="70%" stopColor="#DC2626" />
        <stop offset="100%" stopColor="#7F1D1D" />
      </radialGradient>
      <radialGradient id="sapphireJewel" cx="50%" cy="30%">
        <stop offset="0%" stopColor="#DBEAFE" />
        <stop offset="30%" stopColor="#3B82F6" />
        <stop offset="70%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </radialGradient>
      <radialGradient id="emeraldJewel" cx="50%" cy="30%">
        <stop offset="0%" stopColor="#D1FAE5" />
        <stop offset="30%" stopColor="#10B981" />
        <stop offset="70%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064E3B" />
      </radialGradient>
      <filter id="crownLuxury">
        <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#451A03" floodOpacity="0.6"/>
      </filter>
      <filter id="jewelSparkle">
        <feGaussianBlur stdDeviation="1"/>
        <feColorMatrix values="1 1 1 0 0.3  1 1 1 0 0.3  1 1 1 0 0.3  0 0 0 1 0"/>
      </filter>
    </defs>
    
    <ellipse cx="70" cy="95" rx="60" ry="18" fill="url(#royalGold)" opacity="0.8"/>
    
    <path d="M15 75 L25 20 L35 60 L45 15 L55 55 L70 10 L85 55 L95 15 L105 60 L115 20 L125 75 L110 90 L30 90 Z" 
          fill="url(#royalGold)" filter="url(#crownLuxury)" 
          stroke="#92400E" strokeWidth="2"/>
    
    <rect x="25" y="75" width="90" height="15" fill="url(#royalGold)" rx="7"/>
    
    <circle cx="70" cy="18" r="8" fill="url(#rubyJewel)" filter="url(#jewelSparkle)" stroke="#7F1D1D" strokeWidth="1"/>
    <circle cx="45" cy="25" r="6" fill="url(#sapphireJewel)" filter="url(#jewelSparkle)" stroke="#1E3A8A" strokeWidth="1"/>
    <circle cx="95" cy="25" r="6" fill="url(#emeraldJewel)" filter="url(#jewelSparkle)" stroke="#064E3B" strokeWidth="1"/>
    <circle cx="35" cy="45" r="4" fill="url(#rubyJewel)" filter="url(#jewelSparkle)"/>
    <circle cx="105" cy="45" r="4" fill="url(#sapphireJewel)" filter="url(#jewelSparkle)"/>
    
    <rect x="65" y="75" width="10" height="20" fill="url(#royalGold)" rx="5"/>
    <path d="M70 15 L74 22 L70 25 L66 22 Z" fill="#FFFBEB" opacity="0.8"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="11" fill="#92400E" fontWeight="900" letterSpacing="2px">MAJESTY</text>
  </svg>
);

export const ShieldBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="titaniumMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#18181B" />
        <stop offset="20%" stopColor="#27272A" />
        <stop offset="40%" stopColor="#3F3F46" />
        <stop offset="60%" stopColor="#52525B" />
        <stop offset="80%" stopColor="#71717A" />
        <stop offset="100%" stopColor="#A1A1AA" />
      </linearGradient>
      <linearGradient id="titaniumHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F4F4F5" />
        <stop offset="50%" stopColor="#E4E4E7" />
        <stop offset="100%" stopColor="#D4D4D8" />
      </linearGradient>
      <radialGradient id="emeraldCore" cx="50%" cy="30%">
        <stop offset="0%" stopColor="#A7F3D0" />
        <stop offset="40%" stopColor="#34D399" />
        <stop offset="80%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064E3B" />
      </radialGradient>
      <filter id="titaniumForge">
        <feDropShadow dx="0" dy="20" stdDeviation="16" floodColor="#000000" floodOpacity="0.7"/>
      </filter>
      <filter id="emeraldGlow">
        <feGaussianBlur stdDeviation="2"/>
        <feColorMatrix values="0 1 0.6 0 0  0 1 0.6 0 0  0 1 0.6 0 0  0 0 0 0.8 0"/>
      </filter>
    </defs>
    
    <path d="M70 10 C100 10 125 25 125 45 C125 80 100 110 70 130 C40 110 15 80 15 45 C15 25 40 10 70 10 Z" 
          fill="url(#titaniumMetal)" filter="url(#titaniumForge)" 
          stroke="#71717A" strokeWidth="3"/>
    
    <path d="M70 20 C90 20 110 30 110 45 C110 75 90 100 70 115 C50 100 30 75 30 45 C30 30 50 20 70 20 Z" 
          fill="url(#titaniumHighlight)" opacity="0.7"/>
    
    <circle cx="70" cy="60" r="30" fill="url(#emeraldCore)" filter="url(#emeraldGlow)" opacity="0.9"/>
    <circle cx="70" cy="60" r="20" fill="#064E3B" opacity="0.6"/>
    
    <path d="M58 60 L66 68 L82 48" stroke="#FFFFFF" strokeWidth="5" fill="none" 
          strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
    
    <path d="M25 50 Q70 35 115 50" stroke="#A1A1AA" strokeWidth="2" fill="none" opacity="0.6"/>
    <path d="M30 65 Q70 50 110 65" stroke="#A1A1AA" strokeWidth="2" fill="none" opacity="0.6"/>
    <path d="M35 80 Q70 65 105 80" stroke="#A1A1AA" strokeWidth="2" fill="none" opacity="0.6"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="10" fill="#059669" fontWeight="900" letterSpacing="1.5px">FORTRESS</text>
  </svg>
);

export const LightningBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="copperMetal" cx="50%" cy="30%">
        <stop offset="0%" stopColor="#FDF4FF" />
        <stop offset="20%" stopColor="#FAE8FF" />
        <stop offset="40%" stopColor="#F3E8FF" />
        <stop offset="60%" stopColor="#E879F9" />
        <stop offset="80%" stopColor="#C026D3" />
        <stop offset="100%" stopColor="#86198F" />
      </radialGradient>
      <linearGradient id="electricCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#F0F9FF" />
        <stop offset="60%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <filter id="electricField">
        <feGaussianBlur stdDeviation="3"/>
        <feColorMatrix values="0.6 0.8 1 0 0  0.6 0.8 1 0 0  0.6 0.8 1 0 0  0 0 0 0.9 0"/>
      </filter>
      <filter id="copperForge">
        <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#4A044E" floodOpacity="0.6"/>
      </filter>
    </defs>
    
    <polygon points="70,10 110,30 130,70 110,110 70,130 30,110 10,70 30,30" 
             fill="url(#copperMetal)" filter="url(#copperForge)" 
             stroke="#86198F" strokeWidth="3"/>
    
    <polygon points="70,20 100,35 115,70 100,105 70,120 40,105 25,70 40,35" 
             fill="url(#electricCore)" opacity="0.8" filter="url(#electricField)"/>
    
    <path d="M55 25 L45 55 L65 55 L40 95 L85 60 L65 60 L90 25 L70 45 L55 25 Z" 
          fill="#FFFFFF" opacity="0.95" stroke="#0369A1" strokeWidth="2"/>
    
    <circle cx="45" cy="40" r="4" fill="#FFFFFF" opacity="0.9" filter="url(#electricField)"/>
    <circle cx="95" cy="50" r="3" fill="#FFFFFF" opacity="0.8" filter="url(#electricField)"/>
    <circle cx="85" cy="85" r="2.5" fill="#FFFFFF" opacity="0.7" filter="url(#electricField)"/>
    <circle cx="30" cy="75" r="2" fill="#FFFFFF" opacity="0.6" filter="url(#electricField)"/>
    
    <path d="M35 45 Q50 35 65 45" stroke="#0EA5E9" strokeWidth="2" fill="none" opacity="0.8"/>
    <path d="M75 65 Q90 55 105 65" stroke="#0EA5E9" strokeWidth="2" fill="none" opacity="0.8"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="10" fill="#C026D3" fontWeight="900" letterSpacing="1.5px">VOLTAGE</text>
  </svg>
);

export const GemBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rhodiumMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1A1A1A" />
        <stop offset="25%" stopColor="#404040" />
        <stop offset="50%" stopColor="#737373" />
        <stop offset="75%" stopColor="#A3A3A3" />
        <stop offset="100%" stopColor="#D4D4D4" />
      </linearGradient>
      <radialGradient id="aquamarineCore" cx="40%" cy="25%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
        <stop offset="20%" stopColor="#F0FDFA" stopOpacity="0.9"/>
        <stop offset="40%" stopColor="#CCFBF1" stopOpacity="0.8"/>
        <stop offset="60%" stopColor="#5EEAD4" stopOpacity="0.6"/>
        <stop offset="80%" stopColor="#14B8A6" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#0F766E" stopOpacity="0.2"/>
      </radialGradient>
      <filter id="prismRefraction">
        <feGaussianBlur stdDeviation="1"/>
        <feColorMatrix values="0.9 1 1 0 0  0.9 1 1 0 0  0.9 1 1 0 0  0 0 0 0.9 0"/>
      </filter>
      <filter id="rhodiumLuxury">
        <feDropShadow dx="0" dy="22" stdDeviation="18" floodColor="#0A0A0A" floodOpacity="0.7"/>
      </filter>
    </defs>
    
    <ellipse cx="70" cy="110" rx="50" ry="12" fill="#1A1A1A" opacity="0.4"/>
    <polygon points="70,15 100,30 120,50 105,75 120,100 100,115 70,125 40,115 20,100 35,75 20,50 40,30" 
             fill="url(#rhodiumMetal)" filter="url(#rhodiumLuxury)" 
             stroke="#A3A3A3" strokeWidth="2"/>
    
    <polygon points="70,25 95,35 110,55 95,80 110,100 95,110 70,115 45,110 30,100 45,80 30,55 45,35" 
             fill="url(#aquamarineCore)" opacity="0.8" filter="url(#prismRefraction)"/>
    
    <polygon points="70,30 88,38 100,55 88,75 100,95 88,105 70,110 52,105 40,95 52,75 40,55 52,38" 
             fill="#FFFFFF" opacity="0.6"/>
    <polygon points="70,35 83,42 92,55 83,70 92,85 83,95 70,100 57,95 48,85 57,70 48,55 57,42" 
             fill="#FFFFFF" opacity="0.8"/>
    <polygon points="70,40 78,45 85,55 78,65 85,75 78,85 70,90 62,85 55,75 62,65 55,55 62,45" 
             fill="#FFFFFF" opacity="0.95"/>
    
    <path d="M50 45 L65 35" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.9" strokeLinecap="round"/>
    <path d="M90 65 L80 50" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" strokeLinecap="round"/>
    <path d="M55 85 L70 75" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
    
    <circle cx="40" cy="60" r="2" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="100" cy="70" r="2.5" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="85" cy="90" r="1.5" fill="#FFFFFF" opacity="0.7"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="9" fill="#14B8A6" fontWeight="900" letterSpacing="1.5px">PRISMATIC</text>
  </svg>
);

export const TargetBadge = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="carbonFiber" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#0F0F0F" />
        <stop offset="30%" stopColor="#1C1C1C" />
        <stop offset="60%" stopColor="#2A2A2A" />
        <stop offset="90%" stopColor="#171717" />
        <stop offset="100%" stopColor="#0A0A0A" />
      </radialGradient>
      <linearGradient id="crimsonCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEE2E2" />
        <stop offset="25%" stopColor="#FECACA" />
        <stop offset="50%" stopColor="#F87171" />
        <stop offset="75%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
      <filter id="carbonForge">
        <feDropShadow dx="0" dy="24" stdDeviation="20" floodColor="#000000" floodOpacity="0.8"/>
      </filter>
      <filter id="crosshairGlow">
        <feGaussianBlur stdDeviation="2"/>
        <feColorMatrix values="1 0.3 0.3 0 0  1 0.3 0.3 0 0  1 0.3 0.3 0 0  0 0 0 0.9 0"/>
      </filter>
    </defs>
    
    <circle cx="70" cy="70" r="55" fill="url(#carbonFiber)" filter="url(#carbonForge)" 
             stroke="#2A2A2A" strokeWidth="4"/>
    
    <circle cx="70" cy="70" r="45" fill="none" stroke="url(#crimsonCore)" strokeWidth="2" opacity="0.9"/>
    <circle cx="70" cy="70" r="35" fill="none" stroke="url(#crimsonCore)" strokeWidth="2" opacity="0.8"/>
    <circle cx="70" cy="70" r="25" fill="none" stroke="url(#crimsonCore)" strokeWidth="2" opacity="0.7"/>
    <circle cx="70" cy="70" r="15" fill="none" stroke="url(#crimsonCore)" strokeWidth="2" opacity="0.6"/>
    
    <circle cx="70" cy="70" r="10" fill="#FFFFFF" filter="url(#crosshairGlow)"/>
    <circle cx="70" cy="70" r="6" fill="#DC2626" opacity="0.9"/>
    <circle cx="70" cy="70" r="3" fill="#000000"/>
    
    <path d="M45 70 L25 70 M95 70 L115 70 M70 45 L70 25 M70 95 L70 115" 
          stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" filter="url(#crosshairGlow)"/>
    <path d="M50 70 L35 70 M90 70 L105 70 M70 50 L70 35 M70 90 L70 105" 
          stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
    
    <circle cx="70" cy="35" r="2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="70" cy="105" r="2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="35" cy="70" r="2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="105" cy="70" r="2" fill="#FFFFFF" opacity="0.8"/>
    
    <path d="M30 50 Q70 45 110 50" stroke="#2A2A2A" strokeWidth="1" opacity="0.6"/>
    <path d="M30 90 Q70 95 110 90" stroke="#2A2A2A" strokeWidth="1" opacity="0.6"/>
    <path d="M50 30 Q45 70 50 110" stroke="#2A2A2A" strokeWidth="1" opacity="0.6"/>
    <path d="M90 30 Q95 70 90 110" stroke="#2A2A2A" strokeWidth="1" opacity="0.6"/>
    
    <text x="70" y="135" textAnchor="middle" fontSize="9" fill="#DC2626" fontWeight="900" letterSpacing="2px">APEX</text>
  </svg>
);

// Type-safe badge keys
export type BadgeKey = keyof typeof premiumBadges;

// Premium Badge Display Component
interface PremiumBadgeDisplayProps {
  badge: BadgeKey;
  className?: string;
  showTooltip?: boolean;
}

export const PremiumBadgeDisplay = ({ 
  badge, 
  className = "w-8 h-8", 
  showTooltip = false 
}: PremiumBadgeDisplayProps) => {
  const badgeConfig = premiumBadges[badge];
  if (!badgeConfig) return null;

  const BadgeComponent = badgeConfig.component;
  const content = <BadgeComponent className={className} />;

  if (showTooltip) {
    return (
      <div title={`${badgeConfig.name} - ${badgeConfig.description}`} className="cursor-help">
        {content}
      </div>
    );
  }

  return content;
};

// Premium Badge Selector Component
interface PremiumBadgeSelectorProps {
  selectedBadge: BadgeKey;
  onBadgeChange: (badge: BadgeKey) => void;
}

export const PremiumBadgeSelector = ({ selectedBadge, onBadgeChange }: PremiumBadgeSelectorProps) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Premium Badge</label>
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(premiumBadges).map(([key, badge]) => (
          <div
            key={key}
            onClick={() => onBadgeChange(key as BadgeKey)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedBadge === key 
                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <PremiumBadgeDisplay badge={key as BadgeKey} className="w-12 h-12" />
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-900">{badge.name}</div>
                <div className="text-xs text-gray-600 mt-1">{badge.tier}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selectedBadge && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <PremiumBadgeDisplay badge={selectedBadge} className="w-8 h-8" />
            <div>
              <div className="font-semibold text-sm">{premiumBadges[selectedBadge].name}</div>
              <div className="text-xs text-gray-600">{premiumBadges[selectedBadge].description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Badge mapping for easy access
export const premiumBadges = {
  'platinum': {
    component: PlatinumBadge,
    name: 'Platinum Elite',
    description: 'Hexagonal titanium-platinum alloy with pristine metallic finish',
    tier: 'PLATINUM'
  },
  'gold': {
    component: GoldBadge,
    name: 'Aurum Luxury',
    description: 'Octagonal 24-karat gold with precision-cut medallion center',
    tier: 'AURUM'
  },
  'diamond': {
    component: DiamondBadge,
    name: 'Brilliance Cut',
    description: 'Multi-faceted diamond with precision light refraction technology',
    tier: 'BRILLIANCE'
  },
  'crown': {
    component: CrownBadge,
    name: 'Royal Majesty',
    description: 'Hand-forged crown with authentic ruby, sapphire & emerald jewels',
    tier: 'MAJESTY'
  },
  'shield': {
    component: ShieldBadge,
    name: 'Titanium Fortress',
    description: 'Military-grade titanium shield with emerald security core',
    tier: 'FORTRESS'
  },
  'lightning': {
    component: LightningBadge,
    name: 'Electric Voltage',
    description: 'Copper-electric hexagon with high-voltage discharge effects',
    tier: 'VOLTAGE'
  },
  'gem': {
    component: GemBadge,
    name: 'Prismatic Crystal',
    description: 'Rhodium-encased aquamarine crystal with multi-layered refraction',
    tier: 'PRISMATIC'
  },
  'target': {
    component: TargetBadge,
    name: 'Carbon Apex',
    description: 'Carbon fiber targeting system with precision crosshair technology',
    tier: 'APEX'
  }
};