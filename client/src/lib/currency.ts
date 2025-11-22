/**
 * Currency formatting utilities
 */

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Format currency amount with appropriate symbol
 * @param amount - The amount to format (can be string or number)
 * @param currency - The currency code (e.g., 'INR', 'USD')
 * @param options - Additional formatting options
 * @returns Formatted currency string (e.g., '₹19000.00' or '$199.00')
 */
export function formatCurrency(
  amount: number | string, 
  currency: string,
  options: {
    showDecimals?: boolean;
    locale?: string;
  } = {}
): string {
  const { showDecimals = true, locale = 'en-IN' } = options;
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '—';
  }

  const symbol = getCurrencySymbol(currency);
  
  if (showDecimals) {
    return `${symbol}${numAmount.toFixed(2)}`;
  }
  
  return `${symbol}${Math.round(numAmount)}`;
}

/**
 * Format currency for monthly display (divide by 12)
 * @param yearlyAmount - The yearly amount
 * @param currency - The currency code
 * @returns Formatted monthly amount
 */
export function formatMonthlyFromYearly(
  yearlyAmount: number | string,
  currency: string
): string {
  const numAmount = typeof yearlyAmount === 'string' ? parseFloat(yearlyAmount) : yearlyAmount;
  const monthly = numAmount / 12;
  return formatCurrency(monthly, currency, { showDecimals: false });
}
