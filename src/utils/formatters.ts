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
  } catch (e) {
    // ignore
  }
  return dateStr;
};
