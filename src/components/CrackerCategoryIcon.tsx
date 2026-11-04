import React from 'react';
import { CrackerCategory } from '../types';

interface Props {
  category: CrackerCategory;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CrackerCategoryIcon: React.FC<Props> = ({
  category,
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const dimension = sizeMap[size] || sizeMap.md;

  switch (category) {
    case 'Fuljhadi':
    case 'Sparklers':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* Sparkler stick */}
          <line x1="12" y1="36" x2="28" y2="20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="20" x2="36" y2="12" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="2 2" />
          {/* Spark center */}
          <circle cx="36" cy="12" r="3" fill="#FBBF24" />
          {/* Sparks rays */}
          <path d="M36 4V7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 17V20" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 12H31" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 12H44" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          {/* Diagonal sparks */}
          <path d="M30 6L32.5 8.5" stroke="#FB923C" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M42 18L39.5 15.5" stroke="#FB923C" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M30 18L32.5 15.5" stroke="#F43F5E" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M42 6L39.5 8.5" stroke="#F43F5E" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'Flower Pots':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* Fountain sparks shooting upward */}
          <path d="M24 16C24 9 17 6 12 7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 14C24 6 24 3 24 2" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 16C24 9 31 6 36 7" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="1.5" fill="#FEF08A" />
          <circle cx="24" cy="2" r="1.75" fill="#FEF08A" />
          <circle cx="36" cy="7" r="1.5" fill="#FEF08A" />
          {/* Flower pot cone */}
          <polygon points="14,40 34,40 28,18 20,18" fill="url(#flowerPotGrad)" stroke="#EAB308" strokeWidth="1.5" />
          {/* Pot base rim */}
          <rect x="12" y="39" width="24" height="4" rx="2" fill="#B45309" />
          {/* Decorative band */}
          <line x1="17" y1="28" x2="31" y2="28" stroke="#FEF08A" strokeWidth="1.5" />
          <defs>
            <linearGradient id="flowerPotGrad" x1="24" y1="18" x2="24" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EA580C" />
              <stop offset="1" stopColor="#9A3412" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Ground Chakkars':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* Spiral spinning chakkar */}
          <circle cx="24" cy="24" r="18" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="24" cy="24" r="13" stroke="#F97316" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="24" cy="24" r="8" fill="url(#chakkarGrad)" stroke="#FEF08A" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3" fill="#FFFBEB" />
          {/* Tangent fiery sparks */}
          <path d="M37 24C37 18 33 13 28 11" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 24C11 30 15 35 20 37" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 37C30 37 35 33 37 28" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 11C18 11 13 15 11 20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="chakkarGrad" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F97316" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Rockets':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* Rocket stick */}
          <line x1="16" y1="44" x2="28" y2="24" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          {/* Rocket fuselage */}
          <g transform="rotate(-35 28 20)">
            <rect x="23" y="14" width="10" height="20" rx="2" fill="url(#rocketBody)" stroke="#F59E0B" strokeWidth="1.5" />
            {/* Nosecone */}
            <polygon points="28,4 23,14 33,14" fill="#EF4444" />
            {/* Fins */}
            <polygon points="23,30 18,34 23,34" fill="#DC2626" />
            <polygon points="33,30 38,34 33,34" fill="#DC2626" />
            {/* Thrust flame */}
            <path d="M25 34L28 42L31 34Z" fill="#FBBF24" />
          </g>
          <defs>
            <linearGradient id="rocketBody" x1="23" y1="14" x2="33" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EA580C" />
              <stop offset="1" stopColor="#7C2D12" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Sound Crackers':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* String/fuse */}
          <path d="M12 12Q24 8 36 12" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          {/* Red cylinders hanging (Ladi crackers) */}
          <rect x="14" y="14" width="5" height="18" rx="1.5" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
          <rect x="22" y="16" width="5" height="20" rx="1.5" fill="#EF4444" stroke="#991B1B" strokeWidth="1" />
          <rect x="30" y="14" width="5" height="18" rx="1.5" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
          {/* Gold bands */}
          <rect x="14" y="21" width="5" height="4" fill="#FBBF24" />
          <rect x="22" y="24" width="5" height="4" fill="#FBBF24" />
          <rect x="30" y="21" width="5" height="4" fill="#FBBF24" />
          {/* Little burst */}
          <path d="M38 34L41 37" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 40L39 42" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="39" r="1.5" fill="#FEF08A" />
        </svg>
      );

    case 'Combos':
    case 'Gift Boxes':
    default:
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimension} ${className}`}
        >
          {/* Gift box base */}
          <rect x="10" y="18" width="28" height="22" rx="3" fill="url(#giftGrad)" stroke="#F59E0B" strokeWidth="1.5" />
          {/* Box lid */}
          <rect x="8" y="14" width="32" height="6" rx="2" fill="#B45309" stroke="#FBBF24" strokeWidth="1" />
          {/* Golden ribbon vertical */}
          <rect x="22" y="14" width="4" height="26" fill="#FBBF24" />
          {/* Golden ribbon horizontal */}
          <rect x="10" y="27" width="28" height="4" fill="#FBBF24" />
          {/* Bow on top */}
          <path d="M20 14C17 10 15 11 18 8C21 5 23 11 24 14" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />
          <path d="M28 14C31 10 33 11 30 8C27 5 25 11 24 14" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />
          <defs>
            <linearGradient id="giftGrad" x1="10" y1="18" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C2410C" />
              <stop offset="1" stopColor="#7C2D12" />
            </linearGradient>
          </defs>
        </svg>
      );
  }
};
