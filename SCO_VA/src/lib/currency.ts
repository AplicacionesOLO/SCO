
export const formatCurrency = (amount: number, currency: string = 'CRC'): string => {
  // Validar null, undefined y NaN
  if (amount == null || isNaN(amount)) return '0,00';
  
  // Formatear con separador de miles como coma y decimales con punto
  const formatted = amount.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatted;
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
