export const formatDateForFrontEnd = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  // Check if it's YYYY-MM-DD format
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2].split('T')[0]; // Handle timestamp
    // Return DD/MM/YYYY
    if (year.length === 4) {
      return `${day}/${month}/${year}`;
    }
  }
  // Fallback
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-VE');
    }
  } catch {
    // ignore
  }
  return dateStr;
};

export const getCaracasDateParts = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: parseInt(partMap.year),
    month: parseInt(partMap.month),
    day: parseInt(partMap.day),
    hour: parseInt(partMap.hour),
    minute: parseInt(partMap.minute),
    second: parseInt(partMap.second),
    dateString: `${partMap.year}-${partMap.month}-${partMap.day}`,
  };
};

export const getErrorMessage = (err: unknown, defaultMsg = 'Error desconocido'): string => {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string' &&
    (err as { message: string }).message
  ) {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return defaultMsg;
  }
};

/**
 * Formatea un monto numérico con separadores de miles en punto (.)
 * y separador decimal en coma (,), por ejemplo: 1234.5 -> "1.234,50".
 */
export const formatAmount = (amount?: number | string | null, decimals = 2): string => {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (num === null || num === undefined || Number.isNaN(num) || !Number.isFinite(num)) {
    return (0).toFixed(decimals).replace('.', ',');
  }
  const isNegative = num < 0;
  const absFixed = Math.abs(num).toFixed(decimals);
  const [intPart, decPart] = absFixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
  return isNegative ? `-${formatted}` : formatted;
};

export const formatUsd = (amount?: number | string | null): string => `$${formatAmount(amount, 2)}`;

export const formatVes = (amount?: number | string | null): string =>
  `Bs. ${formatAmount(amount, 2)}`;
