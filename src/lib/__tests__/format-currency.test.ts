import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../format-currency';

describe('formatCurrency', () => {
  it('should format numbers correctly in MAD', () => {
    const result = formatCurrency(12500).replace(/\u00a0/g, ' ');
    expect(result).toBe('12.500,00 MAD');
  });

  it('should handle zero', () => {
    const result = formatCurrency(0).replace(/\u00a0/g, ' ');
    expect(result).toBe('0,00 MAD');
  });

  it('should handle small decimals', () => {
    const result = formatCurrency(0.5).replace(/\u00a0/g, ' ');
    expect(result).toBe('0,50 MAD');
  });

  it('should handle different currencies', () => {
    const result = formatCurrency(100, 'EUR').replace(/\u00a0/g, ' ');
    expect(result).toBe('100,00 EUR');
  });

  it('should handle null/undefined', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});
