import { describe, it, expect } from 'vitest';
import { getMultiplier, calculatePrice } from '../src/pricing.js';

describe('getMultiplier', () => {
  const tiers = [
    { min_qty: 1, max_qty: 9, multiplier: 2.0 },
    { min_qty: 10, max_qty: 19, multiplier: 0.9 },
    { min_qty: 20, max_qty: 49, multiplier: 0.8 },
    { min_qty: 50, max_qty: 99, multiplier: 0.7 },
    { min_qty: 100, max_qty: 199, multiplier: 0.6 },
    { min_qty: 200, max_qty: 499, multiplier: 0.5 },
    { min_qty: 500, max_qty: 999, multiplier: 0.45 },
    { min_qty: 1000, max_qty: null, multiplier: 0.4 },
  ];

  it('returns 2.0 for qty=5', () => {
    expect(getMultiplier(tiers, 5)).toBe(2.0);
  });

  it('returns 0.9 for qty=10', () => {
    expect(getMultiplier(tiers, 10)).toBe(0.9);
  });

  it('returns 0.6 for qty=100', () => {
    expect(getMultiplier(tiers, 100)).toBe(0.6);
  });

  it('returns 0.4 for qty=1000', () => {
    expect(getMultiplier(tiers, 1000)).toBe(0.4);
  });

  it('returns 0.4 for qty=5000 (open-ended last tier)', () => {
    expect(getMultiplier(tiers, 5000)).toBe(0.4);
  });

  it('returns 1 when no tiers provided', () => {
    expect(getMultiplier([], 100)).toBe(1);
  });
});

describe('calculatePrice', () => {
  const tiers = [
    { min_qty: 1, max_qty: 9, multiplier: 2.0 },
    { min_qty: 10, max_qty: 19, multiplier: 0.9 },
    { min_qty: 100, max_qty: 199, multiplier: 0.6 },
    { min_qty: 1000, max_qty: null, multiplier: 0.4 },
  ];

  it('calculates with no print methods', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 0,
      backPrintPrice: 0,
      quantity: 1000,
      tiers,
    });
    // subtotal = 1550, multiplier = 0.4, unit = 620, total = 620000
    expect(result.unitPrice).toBe(620);
    expect(result.total).toBe(620000);
    expect(result.multiplier).toBe(0.4);
  });

  it('calculates with front + back print', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 250,
      backPrintPrice: 500,
      quantity: 100,
      tiers,
    });
    // subtotal = 1550 + 250 + 500 = 2300, multiplier = 0.6, unit = 1380, total = 138000
    expect(result.unitPrice).toBe(1380);
    expect(result.total).toBe(138000);
  });

  it('includes customization price in subtotal', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 250,
      backPrintPrice: 500,
      customizationPrice: 200,
      quantity: 100,
      tiers,
    });
    // subtotal = 2500, multiplier = 0.6, unit = 1500, total = 150000
    expect(result.unitPrice).toBe(1500);
    expect(result.total).toBe(150000);
  });

  it('calculates with small quantity (multiplier > 1)', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 250,
      backPrintPrice: 0,
      quantity: 5,
      tiers,
    });
    // subtotal = 1800, multiplier = 2.0, unit = 3600, total = 18000
    expect(result.unitPrice).toBe(3600);
    expect(result.total).toBe(18000);
  });

  it('returns zeros when basePrice is 0', () => {
    const result = calculatePrice({
      basePrice: 0,
      frontPrintPrice: 0,
      backPrintPrice: 0,
      quantity: 100,
      tiers,
    });
    expect(result.unitPrice).toBe(0);
    expect(result.total).toBe(0);
  });
});
