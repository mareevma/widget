/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import '../src/main.js';

describe('MerchConfigurator mobile helpers', () => {
  it('detects very dark color hex values', () => {
    const Ctor = customElements.get('merch-configurator');
    const el = new Ctor();

    expect(el._isVeryDarkColor('#000000')).toBe(true);
    expect(el._isVeryDarkColor('#101010')).toBe(true);
    expect(el._isVeryDarkColor('#FFFFFF')).toBe(false);
    expect(el._isVeryDarkColor('invalid')).toBe(false);
  });

  it('computes visible and next mobile steps', () => {
    const Ctor = customElements.get('merch-configurator');
    const el = new Ctor();
    el.store.setData({
      categories: [],
      fits: [],
      materials: [],
      productVariants: [],
      categoryFits: [],
      categoryMaterials: [],
      printMethods: [],
      quantityTiers: [],
      colorPalettes: [{ id: 1, color_name: 'Черный', hex_code: '#000000' }],
    });
    el.store.update({ categoryId: 1, fitId: 2, materialId: 3 });

    const state = el.store.getState();
    expect(el._getVisibleMobileSteps(state)).toEqual([
      'category',
      'fit',
      'material',
      'color',
      'print-front',
      'print-back',
    ]);
    expect(el._getNextVisibleStep(state, 'material')).toBe('color');
  });
});
