/**
 * Formats a number as Indian Rupee (₹) using the official en-IN numbering format
 * e.g., 2850000 -> ₹28,50,000
 */
export function formatINR(val: number): string {
  if (isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}
