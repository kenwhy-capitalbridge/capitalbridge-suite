
export const formatCurrency = (value: number, prefix: string = 'RM'): string => {
  const formattedNumber = new Intl.NumberFormat('en-MY', {
    maximumFractionDigits: 0,
  }).format(value);
  return `${prefix} ${formattedNumber}`;
};

export const formatNumberWithCommas = (value: number): string => {
  return new Intl.NumberFormat('en-MY').format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
