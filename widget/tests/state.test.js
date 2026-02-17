import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state.js';

describe('createStore', () => {
  it('initializes with default state', () => {
    const store = createStore();
    expect(store.getState().categoryId).toBe(null);
    expect(store.getState().quantity).toBe(100);
  });

  it('updates state and notifies listeners', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ categoryId: 1 });

    expect(store.getState().categoryId).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns available fits for selected category', () => {
    const store = createStore();
    store.setData({
      categories: [{ id: 1, name: 'Футболки' }],
      fits: [
        { id: 1, name: 'Оверсайз' },
        { id: 2, name: 'Стандарт' },
        { id: 3, name: 'Длинный рукав' },
      ],
      materials: [],
      productVariants: [
        { category_id: 1, fit_id: 1, material_id: 1, base_price: 1550 },
        { category_id: 1, fit_id: 2, material_id: 1, base_price: 1550 },
        { category_id: 2, fit_id: 3, material_id: 1, base_price: 1550 },
      ],
      printMethods: [],
      quantityTiers: [],
      colorPalettes: [],
    });
    store.selectCategory(1);

    const fits = store.getAvailableFits();
    expect(fits).toHaveLength(2);
    expect(fits.map((f) => f.name)).toEqual(['Оверсайз', 'Стандарт']);
  });

  it('returns available materials for selected category+fit', () => {
    const store = createStore();
    store.setData({
      categories: [],
      fits: [],
      materials: [
        { id: 1, name: '240г френч терри' },
        { id: 2, name: '250г х/б' },
        { id: 3, name: '300г х/б' },
      ],
      productVariants: [
        { category_id: 1, fit_id: 1, material_id: 1, base_price: 1550 },
        { category_id: 1, fit_id: 1, material_id: 2, base_price: 1550 },
        { category_id: 1, fit_id: 2, material_id: 3, base_price: 1650 },
      ],
      printMethods: [],
      quantityTiers: [],
      colorPalettes: [],
    });
    store.update({ categoryId: 1, fitId: 1 });

    const materials = store.getAvailableMaterials();
    expect(materials).toHaveLength(2);
    expect(materials.map((m) => m.name)).toEqual(['240г френч терри', '250г х/б']);
  });

  it('resets downstream selections when category changes', () => {
    const store = createStore();
    store.update({ categoryId: 1, fitId: 2, materialId: 3, colorId: 5 });
    store.selectCategory(2);

    const state = store.getState();
    expect(state.categoryId).toBe(2);
    expect(state.fitId).toBe(null);
    expect(state.materialId).toBe(null);
    expect(state.colorId).toBe(null);
  });

  it('resets downstream selections when fit changes', () => {
    const store = createStore();
    store.update({ categoryId: 1, fitId: 2, materialId: 3, colorId: 5 });
    store.selectFit(4);

    const state = store.getState();
    expect(state.fitId).toBe(4);
    expect(state.materialId).toBe(null);
    expect(state.colorId).toBe(null);
  });

  it('returns base price for selected variant', () => {
    const store = createStore();
    store.setData({
      categories: [],
      fits: [],
      materials: [],
      productVariants: [
        { category_id: 1, fit_id: 1, material_id: 2, base_price: 1550 },
      ],
      printMethods: [],
      quantityTiers: [],
      colorPalettes: [],
    });
    store.update({ categoryId: 1, fitId: 1, materialId: 2 });

    expect(store.getBasePrice()).toBe(1550);
  });

  it('returns print method price', () => {
    const store = createStore();
    store.setData({
      categories: [],
      fits: [],
      materials: [],
      productVariants: [],
      printMethods: [
        { id: 1, name: 'Без нанесения', price: 0 },
        { id: 2, name: 'DTF', price: 250 },
      ],
      quantityTiers: [],
      colorPalettes: [],
    });

    expect(store.getPrintPrice(2)).toBe(250);
    expect(store.getPrintPrice(1)).toBe(0);
    expect(store.getPrintPrice(null)).toBe(0);
  });

  it('returns colors for selected material', () => {
    const store = createStore();
    store.setData({
      categories: [],
      fits: [],
      materials: [],
      productVariants: [],
      printMethods: [],
      quantityTiers: [],
      colorPalettes: [
        { id: 1, material_id: 10, color_name: 'Чёрный', hex_code: '#000' },
        { id: 2, material_id: 11, color_name: 'Белый', hex_code: '#FFF' },
      ],
    });
    store.update({ materialId: 10 });

    const colors = store.getAvailableColors();
    expect(colors).toHaveLength(1);
    expect(colors[0].color_name).toBe('Чёрный');
  });
});
