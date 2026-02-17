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

  it('filters options by selected category', () => {
    const store = createStore();
    store.setData({
      categories: [{ id: 1, name: 'Футболки' }],
      sections: [{ id: 1, slug: 'material', depends_on_category: true }],
      options: [
        { id: 10, section_id: 1, name: 'Кулирка', available_for_categories: [1, 2] },
        { id: 11, section_id: 1, name: 'Футер', available_for_categories: [3, 4] },
      ],
      pricingRules: [],
      colorPalettes: [],
    });
    store.update({ categoryId: 1 });

    const filtered = store.getOptionsForSection(1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Кулирка');
  });

  it('filters color palettes by selected material', () => {
    const store = createStore();
    store.setData({
      categories: [],
      sections: [],
      options: [],
      pricingRules: [],
      colorPalettes: [
        { id: 1, material_option_id: 10, color_name: 'Чёрный', hex_code: '#000' },
        { id: 2, material_option_id: 11, color_name: 'Белый', hex_code: '#FFF' },
      ],
    });

    const colors = store.getColorsForMaterial(10);
    expect(colors).toHaveLength(1);
    expect(colors[0].color_name).toBe('Чёрный');
  });
});
