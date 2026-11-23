import React from 'react';
import type { BanknoteDenomination, CashCurrencyCode } from '../utils/currencyDenominations';

export interface BanknoteThumbnailProps {
  currency: CashCurrencyCode;
  denomination: BanknoteDenomination;
  isActive?: boolean;
}

export const BanknoteThumbnail: React.FC<BanknoteThumbnailProps> = ({
  currency,
  denomination,
  isActive = false,
}) => {
  const displayValue =
    currency === 'COP' ? `${denomination.value / 1000}MIL` : String(denomination.value);

  const symbol =
    currency === 'VES' ? 'Bs.' : currency === 'EUR' ? '€' : currency === 'COP' ? 'COP' : '$';

  return (
    <div
      data-testid={`banknote-thumb-${currency}-${denomination.value}`}
      aria-hidden="true"
      style={{
        width: '86px',
        height: '44px',
        flexShrink: 0,
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: isActive
          ? `0 0 0 2px ${denomination.primaryColor}, 0 4px 10px rgba(15, 23, 42, 0.14)`
          : '0 2px 5px rgba(15, 23, 42, 0.1)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isActive ? 'scale(1.03)' : 'scale(1)',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 172 88"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Miniatura ${denomination.label}`}
      >
        {/* Papel moneda de fondo */}
        <rect
          x="0"
          y="0"
          width="172"
          height="88"
          rx="8"
          fill={denomination.secondaryColor}
          stroke={denomination.primaryColor}
          strokeWidth="4"
        />

        {/* Marco interior grabado tipo billete */}
        <rect
          x="8"
          y="8"
          width="156"
          height="72"
          rx="4"
          fill="none"
          stroke={denomination.primaryColor}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.55"
        />

        {/* Banda de seguridad holográfica vertical */}
        <rect x="122" y="4" width="10" height="80" fill={denomination.accentColor} opacity="0.28" />
        <line
          x1="127"
          y1="4"
          x2="127"
          y2="84"
          stroke={denomination.primaryColor}
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.6"
        />

        {/* Medallón / Retrato central estilizado */}
        <ellipse
          cx="92"
          cy="44"
          rx="22"
          ry="26"
          fill={denomination.accentColor}
          opacity="0.18"
          stroke={denomination.primaryColor}
          strokeWidth="1.5"
        />
        <circle cx="92" cy="38" r="7" fill={denomination.primaryColor} opacity="0.35" />
        <path d="M80 58 C80 49, 104 49, 104 58" fill={denomination.primaryColor} opacity="0.35" />

        {/* Esquina superior izquierda: Código moneda */}
        <rect
          x="13"
          y="13"
          width="38"
          height="16"
          rx="3"
          fill={denomination.primaryColor}
          opacity="0.9"
        />
        <text
          x="32"
          y="24"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {symbol}
        </text>

        {/* Denominación principal grande */}
        <text
          x="15"
          y="58"
          fill={denomination.primaryColor}
          fontSize={displayValue.length > 3 ? '21' : '25'}
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
        >
          {displayValue}
        </text>

        {/* Subtítulo de serie / motivo en la base */}
        <text
          x="15"
          y="73"
          fill={denomination.primaryColor}
          fontSize="8.5"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.8"
        >
          {denomination.motif.toUpperCase()}
        </text>

        {/* Valor esquina inferior derecha */}
        <text
          x="157"
          y="73"
          textAnchor="end"
          fill={denomination.primaryColor}
          fontSize="11"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {displayValue}
        </text>
      </svg>
    </div>
  );
};
