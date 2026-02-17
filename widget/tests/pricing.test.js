import { describe, it, expect } from 'vitest';
import { calculatePrice, getTieredPrice } from '../src/pricing.js';

describe('getTieredPrice', () => {
  const tiers = [
    { min_qty: 1, max_qty: 49, price: 100 },
    { min_qty: 50, max_qty: 99, price: 80 },
    { min_qty: 100, max_qty: null, price: 60 },
  ];

  it('returns price for first tier', () => {
    expect(getTieredPrice(tiers, 10)).toBe(100);
  });

  it('returns price for middle tier', () => {
    expect(getTieredPrice(tiers, 75)).toBe(80);
  });

  it('returns price for last tier (no max)', () => {
    expect(getTieredPrice(tiers, 500)).toBe(60);
  });

  it('returns 0 for empty tiers', () => {
    expect(getTieredPrice([], 10)).toBe(0);
  });
});

describe('calculatePrice', () => {
  const rules = [
    { category_id: 1, option_id: null, base_price: 500, price_type: 'fixed', tiers: null },
    { category_id: null, option_id: 10, base_price: 200, price_type: 'fixed', tiers: null },
    { category_id: null, option_id: 20, base_price: 0, price_type: 'tiered', tiers: [
      { min_qty: 1, max_qty: 49, price: 150 },
      { min_qty: 50, max_qty: null, price: 100 },
    ]},
  ];

  it('sums fixed prices for selected options', () => {
    const selection = { categoryId: 1, optionIds: [10], quantity: 1 };
    // 500 (category base) + 200 (option 10) = 700
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 700, total: 700 });
  });

  it('applies tiered pricing based on quantity', () => {
    const selection = { categoryId: 1, optionIds: [20], quantity: 100 };
    // 500 (category base) + 100 (tiered, qty 100) = 600
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 600, total: 60000 });
  });

  it('handles no matching rules gracefully', () => {
    const selection = { categoryId: 99, optionIds: [], quantity: 1 };
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 0, total: 0 });
  });
});
