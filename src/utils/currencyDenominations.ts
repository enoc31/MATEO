import { formatAmount } from './formatters';

export type CashCurrencyCode = 'VES' | 'USD' | 'EUR' | 'COP';

export interface BanknoteDenomination {
  value: number;
  label: string;
  shortLabel: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  motif: string;
}

export interface CurrencyConeConfig {
  code: CashCurrencyCode;
  name: string;
  coneLabel: string;
  symbol: string;
  flag: string;
  rateLabel?: string;
  rateHelper?: string;
  defaultRateToUsd: number;
  /**
   * 'multiply': monto_usd = monto_original * rate (e.g. EUR -> USD, 1 EUR = 1.08 USD)
   * 'divide': monto_usd = monto_original / rate (e.g. VES -> USD or COP -> USD)
   * 'identity': monto_usd = monto_original (USD)
   */
  usdConversionMode: 'identity' | 'divide' | 'multiply';
  denominations: BanknoteDenomination[];
}

export const CURRENCY_CONES: Record<CashCurrencyCode, CurrencyConeConfig> = {
  VES: {
    code: 'VES',
    name: 'Bolívares (Cono Venezolano)',
    coneLabel: 'Venezolano (VES)',
    symbol: 'Bs.',
    flag: '🇻🇪',
    rateLabel: 'Tasa BCV (Bs. por 1 USD)',
    rateHelper: 'Divide el total en Bs. entre la tasa BCV',
    defaultRateToUsd: 45,
    usdConversionMode: 'divide',
    denominations: [
      {
        value: 5,
        label: 'Billete de Bs. 5',
        shortLabel: 'Bs. 5',
        primaryColor: '#854d0e',
        secondaryColor: '#fef08a',
        accentColor: '#ca8a04',
        motif: 'Carabobo',
      },
      {
        value: 10,
        label: 'Billete de Bs. 10',
        shortLabel: 'Bs. 10',
        primaryColor: '#6b21a8',
        secondaryColor: '#f3e8ff',
        accentColor: '#9333ea',
        motif: 'Carabobo',
      },
      {
        value: 20,
        label: 'Billete de Bs. 20',
        shortLabel: 'Bs. 20',
        primaryColor: '#c2410c',
        secondaryColor: '#ffedd5',
        accentColor: '#ea580c',
        motif: 'Carabobo',
      },
      {
        value: 50,
        label: 'Billete de Bs. 50',
        shortLabel: 'Bs. 50',
        primaryColor: '#15803d',
        secondaryColor: '#dcfce7',
        accentColor: '#16a34a',
        motif: 'Carabobo',
      },
      {
        value: 100,
        label: 'Billete de Bs. 100',
        shortLabel: 'Bs. 100',
        primaryColor: '#7e22ce',
        secondaryColor: '#f5d0fe',
        accentColor: '#a855f7',
        motif: 'Carabobo',
      },
      {
        value: 200,
        label: 'Billete de Bs. 200',
        shortLabel: 'Bs. 200',
        primaryColor: '#0f766e',
        secondaryColor: '#ccfbf1',
        accentColor: '#14b8a6',
        motif: 'Trilogía Bolívar',
      },
      {
        value: 500,
        label: 'Billete de Bs. 500',
        shortLabel: 'Bs. 500',
        primaryColor: '#92400e',
        secondaryColor: '#fde68a',
        accentColor: '#d97706',
        motif: 'Trilogía Bolívar',
      },
    ],
  },
  USD: {
    code: 'USD',
    name: 'Dólares (Cono Estadounidense)',
    coneLabel: 'Estadounidense (USD)',
    symbol: '$',
    flag: '🇺🇸',
    defaultRateToUsd: 1,
    usdConversionMode: 'identity',
    denominations: [
      {
        value: 1,
        label: 'Billete de $1',
        shortLabel: '$1',
        primaryColor: '#166534',
        secondaryColor: '#dcfce7',
        accentColor: '#15803d',
        motif: 'Washington',
      },
      {
        value: 2,
        label: 'Billete de $2',
        shortLabel: '$2',
        primaryColor: '#14532d',
        secondaryColor: '#bbf7d0',
        accentColor: '#16a34a',
        motif: 'Jefferson',
      },
      {
        value: 5,
        label: 'Billete de $5',
        shortLabel: '$5',
        primaryColor: '#4c1d95',
        secondaryColor: '#ede9fe',
        accentColor: '#6d28d9',
        motif: 'Lincoln',
      },
      {
        value: 10,
        label: 'Billete de $10',
        shortLabel: '$10',
        primaryColor: '#9a3412',
        secondaryColor: '#ffedd5',
        accentColor: '#c2410c',
        motif: 'Hamilton',
      },
      {
        value: 20,
        label: 'Billete de $20',
        shortLabel: '$20',
        primaryColor: '#065f46',
        secondaryColor: '#d1fae5',
        accentColor: '#059669',
        motif: 'Jackson',
      },
      {
        value: 50,
        label: 'Billete de $50',
        shortLabel: '$50',
        primaryColor: '#831843',
        secondaryColor: '#fce7f3',
        accentColor: '#be185d',
        motif: 'Grant',
      },
      {
        value: 100,
        label: 'Billete de $100',
        shortLabel: '$100',
        primaryColor: '#1e3a8a',
        secondaryColor: '#dbeafe',
        accentColor: '#2563eb',
        motif: 'Franklin',
      },
    ],
  },
  EUR: {
    code: 'EUR',
    name: 'Euros (Cono Europeo)',
    coneLabel: 'Europeo (EUR)',
    symbol: '€',
    flag: '🇪🇺',
    rateLabel: 'Tasa EUR → USD ($ por 1 €)',
    rateHelper: 'Multiplica el total en € por la tasa USD/EUR',
    defaultRateToUsd: 1.08,
    usdConversionMode: 'multiply',
    denominations: [
      {
        value: 5,
        label: 'Billete de €5',
        shortLabel: '€5',
        primaryColor: '#475569',
        secondaryColor: '#e2e8f0',
        accentColor: '#64748b',
        motif: 'Clásica',
      },
      {
        value: 10,
        label: 'Billete de €10',
        shortLabel: '€10',
        primaryColor: '#b91c1c',
        secondaryColor: '#fee2e2',
        accentColor: '#dc2626',
        motif: 'Románica',
      },
      {
        value: 20,
        label: 'Billete de €20',
        shortLabel: '€20',
        primaryColor: '#1d4ed8',
        secondaryColor: '#dbeafe',
        accentColor: '#2563eb',
        motif: 'Gótica',
      },
      {
        value: 50,
        label: 'Billete de €50',
        shortLabel: '€50',
        primaryColor: '#c2410c',
        secondaryColor: '#ffedd5',
        accentColor: '#ea580c',
        motif: 'Renacimiento',
      },
      {
        value: 100,
        label: 'Billete de €100',
        shortLabel: '€100',
        primaryColor: '#15803d',
        secondaryColor: '#dcfce7',
        accentColor: '#16a34a',
        motif: 'Barroco',
      },
      {
        value: 200,
        label: 'Billete de €200',
        shortLabel: '€200',
        primaryColor: '#a16207',
        secondaryColor: '#fef9c3',
        accentColor: '#ca8a04',
        motif: 'Hierro y Cristal',
      },
      {
        value: 500,
        label: 'Billete de €500',
        shortLabel: '€500',
        primaryColor: '#6b21a8',
        secondaryColor: '#f3e8ff',
        accentColor: '#9333ea',
        motif: 'Siglo XX',
      },
    ],
  },
  COP: {
    code: 'COP',
    name: 'Pesos (Cono Colombiano)',
    coneLabel: 'Colombiano (COP)',
    symbol: 'COP $',
    flag: '🇨🇴',
    rateLabel: 'Tasa TRM (COP por 1 USD)',
    rateHelper: 'Divide el total en COP entre la tasa TRM',
    defaultRateToUsd: 4200,
    usdConversionMode: 'divide',
    denominations: [
      {
        value: 2000,
        label: 'Billete de $2.000 COP',
        shortLabel: '$2.000',
        primaryColor: '#0369a1',
        secondaryColor: '#e0f2fe',
        accentColor: '#0284c7',
        motif: 'Débora Arango',
      },
      {
        value: 5000,
        label: 'Billete de $5.000 COP',
        shortLabel: '$5.000',
        primaryColor: '#78350f',
        secondaryColor: '#fef3c7',
        accentColor: '#b45309',
        motif: 'José A. Silva',
      },
      {
        value: 10000,
        label: 'Billete de $10.000 COP',
        shortLabel: '$10.000',
        primaryColor: '#991b1b',
        secondaryColor: '#fee2e2',
        accentColor: '#dc2626',
        motif: 'Virginia Gutiérrez',
      },
      {
        value: 20000,
        label: 'Billete de $20.000 COP',
        shortLabel: '$20.000',
        primaryColor: '#c2410c',
        secondaryColor: '#ffedd5',
        accentColor: '#ea580c',
        motif: ' Alfonso López',
      },
      {
        value: 50000,
        label: 'Billete de $50.000 COP',
        shortLabel: '$50.000',
        primaryColor: '#5b21b6',
        secondaryColor: '#ede9fe',
        accentColor: '#7c3aed',
        motif: 'Gabriel García M.',
      },
      {
        value: 100000,
        label: 'Billete de $100.000 COP',
        shortLabel: '$100.000',
        primaryColor: '#0f766e',
        secondaryColor: '#ccfbf1',
        accentColor: '#0d9488',
        motif: 'Carlos Lleras R.',
      },
    ],
  },
};

export const CASH_CURRENCY_CODES: CashCurrencyCode[] = ['VES', 'USD', 'EUR', 'COP'];

export type CurrencyBillCounts = Record<number, number>;
export type MultiCurrencyBillCounts = Record<CashCurrencyCode, CurrencyBillCounts>;
export type MultiCurrencyRatesToUsd = Record<CashCurrencyCode, number>;

export function createEmptyMultiCurrencyCounts(): MultiCurrencyBillCounts {
  return {
    VES: {},
    USD: {},
    EUR: {},
    COP: {},
  };
}

export function createDefaultMultiCurrencyRates(bcvRate?: number | null): MultiCurrencyRatesToUsd {
  return {
    VES: bcvRate && bcvRate > 0 ? bcvRate : CURRENCY_CONES.VES.defaultRateToUsd,
    USD: 1,
    EUR: CURRENCY_CONES.EUR.defaultRateToUsd,
    COP: CURRENCY_CONES.COP.defaultRateToUsd,
  };
}

export function formatCurrencyByCode(amount: number, code: CashCurrencyCode): string {
  const cone = CURRENCY_CONES[code];
  const decimals = code === 'COP' ? 0 : 2;
  return `${cone.symbol} ${formatAmount(amount, decimals)}`.replace(/\$\s+/, '$');
}

export interface ConeCountSummary {
  code: CashCurrencyCode;
  totalBills: number;
  totalAmountOriginal: number;
  rateToUsd: number;
  equivalentUsd: number;
  breakdownText: string;
  activeItems: { denomination: number; count: number; subtotal: number }[];
}

export function convertCashAmountToUsd(
  amount: number,
  code: CashCurrencyCode,
  rateToUsd: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const cone = CURRENCY_CONES[code];
  if (cone.usdConversionMode === 'identity') {
    return Number(amount.toFixed(2));
  }
  if (cone.usdConversionMode === 'divide') {
    return rateToUsd > 0 ? Number((amount / rateToUsd).toFixed(2)) : 0;
  }
  return rateToUsd > 0 ? Number((amount * rateToUsd).toFixed(2)) : 0;
}

export function convertUsdToCashAmount(
  usdAmount: number,
  code: CashCurrencyCode,
  rateToUsd: number,
): number {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) return 0;
  const cone = CURRENCY_CONES[code];
  if (cone.usdConversionMode === 'identity') {
    return Number(usdAmount.toFixed(2));
  }
  if (cone.usdConversionMode === 'divide') {
    return rateToUsd > 0 ? Number((usdAmount * rateToUsd).toFixed(2)) : 0;
  }
  return rateToUsd > 0 ? Number((usdAmount / rateToUsd).toFixed(2)) : 0;
}

export function calculateConeSummary(
  code: CashCurrencyCode,
  counts: CurrencyBillCounts | undefined,
  rateToUsd: number,
): ConeCountSummary {
  const cone = CURRENCY_CONES[code];
  const safeCounts = counts || {};
  const activeItems: { denomination: number; count: number; subtotal: number }[] = [];

  let totalBills = 0;
  let totalAmountOriginal = 0;

  for (const denom of cone.denominations) {
    const rawCount = safeCounts[denom.value] || 0;
    const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
    if (count > 0) {
      const subtotal = count * denom.value;
      totalBills += count;
      totalAmountOriginal += subtotal;
      activeItems.push({
        denomination: denom.value,
        count,
        subtotal,
      });
    }
  }

  let equivalentUsd = 0;
  if (totalAmountOriginal > 0) {
    if (cone.usdConversionMode === 'identity') {
      equivalentUsd = totalAmountOriginal;
    } else if (cone.usdConversionMode === 'divide') {
      equivalentUsd = rateToUsd > 0 ? Number((totalAmountOriginal / rateToUsd).toFixed(2)) : 0;
    } else if (cone.usdConversionMode === 'multiply') {
      equivalentUsd = rateToUsd > 0 ? Number((totalAmountOriginal * rateToUsd).toFixed(2)) : 0;
    }
  }

  const breakdownParts = activeItems.map(
    (item) =>
      `${item.count}x${formatCurrencyByCode(item.denomination, code)} (${formatCurrencyByCode(item.subtotal, code)})`,
  );

  const breakdownText =
    activeItems.length > 0
      ? `Arqueo ${code} [${totalBills} ${totalBills === 1 ? 'billete' : 'billetes'}]: ${breakdownParts.join(', ')}`
      : '';

  return {
    code,
    totalBills,
    totalAmountOriginal,
    rateToUsd,
    equivalentUsd,
    breakdownText,
    activeItems,
  };
}

export function calculateMultiCurrencySessionSummary(
  allCounts: MultiCurrencyBillCounts,
  allRates: MultiCurrencyRatesToUsd,
): {
  byCurrency: Record<CashCurrencyCode, ConeCountSummary>;
  activeCones: ConeCountSummary[];
  totalBillsAllCones: number;
  totalConsolidatedUsd: number;
} {
  const byCurrency = {
    VES: calculateConeSummary('VES', allCounts.VES, allRates.VES),
    USD: calculateConeSummary('USD', allCounts.USD, allRates.USD),
    EUR: calculateConeSummary('EUR', allCounts.EUR, allRates.EUR),
    COP: calculateConeSummary('COP', allCounts.COP, allRates.COP),
  };

  const activeCones = CASH_CURRENCY_CODES.map((code) => byCurrency[code]).filter(
    (summary) => summary.totalAmountOriginal > 0,
  );

  const totalBillsAllCones = activeCones.reduce((sum, item) => sum + item.totalBills, 0);
  const totalConsolidatedUsd = Number(
    activeCones.reduce((sum, item) => sum + item.equivalentUsd, 0).toFixed(2),
  );

  return {
    byCurrency,
    activeCones,
    totalBillsAllCones,
    totalConsolidatedUsd,
  };
}
