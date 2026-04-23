
export const getCurrencySymbol = (currency: string): string => {
  return currency === 'USD' ? '$' : '₡';
};

export const formatCurrencyWithSymbol = (amount: number, currency: string = 'CRC'): string => {
  if (amount == null || isNaN(amount)) return `${getCurrencySymbol(currency)}0,00`;
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
};

export const formatCurrency = (amount: number, currency: string = 'CRC'): string => {
  // Validar null, undefined y NaN
  if (amount == null || isNaN(amount)) return getCurrencySymbol(currency) + '0,00';
  
  const symbol = getCurrencySymbol(currency);
  // Formatear con separador de miles como coma y decimales con punto
  const formatted = amount.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return symbol + formatted;
};

export const formatNumber = (value: number): string => {
  if (isNaN(value)) return '0,00';
  
  return value.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  
  // Remover espacios y reemplazar comas por puntos para parsing
  const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
};
