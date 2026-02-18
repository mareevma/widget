import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

export default function CustomizationPricing() {
  const [categories, setCategories] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [prices, setPrices] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: cu }, { data: p }] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('customizations').select('id, name, price, is_active').order('sort_order'),
      supabase.from('category_customization_prices').select('*'),
    ]);
    setCategories(c || []);
    setCustomizations((cu || []).filter((x) => x.is_active));
    setPrices(p || []);
    if (!activeCategoryId && c?.length) {
      setActiveCategoryId(c[0].id);
    }
    setDraft({});
    setLoading(false);
  }

  const byCustomizationId = useMemo(() => {
    const map = new Map();
    prices
      .filter((x) => x.category_id === activeCategoryId)
      .forEach((row) => map.set(row.customization_id, row));
    return map;
  }, [prices, activeCategoryId]);

  function getDisplayValue(customizationId) {
    if (Object.prototype.hasOwnProperty.call(draft, customizationId)) {
      return draft[customizationId];
    }
    const row = byCustomizationId.get(customizationId);
    return row ? String(Number(row.price)) : '';
  }

  async function saveValue(customizationId) {
    if (!activeCategoryId) return;
    const raw = getDisplayValue(customizationId).trim();
    const existing = byCustomizationId.get(customizationId);

    setSaving(true);
    if (raw === '') {
      if (existing) {
        await supabase
          .from('category_customization_prices')
          .delete()
          .eq('category_id', activeCategoryId)
          .eq('customization_id', customizationId);
        setPrices((prev) =>
          prev.filter(
            (x) => !(x.category_id === activeCategoryId && x.customization_id === customizationId)
          )
        );
      }
    } else {
      const { data } = await supabase.from('category_customization_prices').upsert(
        {
          category_id: activeCategoryId,
          customization_id: customizationId,
          price: Number(raw),
        },
        { onConflict: 'category_id,customization_id' }
      ).select('*').single();
      if (data) {
        setPrices((prev) => {
          const next = prev.filter(
            (x) => !(x.category_id === data.category_id && x.customization_id === data.customization_id)
          );
          return [...next, data];
        });
      }
    }
    setDraft((prev) => {
      const copy = { ...prev };
      delete copy[customizationId];
      return copy;
    });
    setSaving(false);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Цены кастомизаций по категориям</h2>
      <p className="text-gray-500 text-sm mb-6">
        Пустое значение = использовать базовую цену кастомизации из справочника.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cat.id === activeCategoryId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {customizations.map((item) => {
          const hasOverride = byCustomizationId.has(item.id);
          return (
            <div key={item.id} className="bg-gray-800 p-3 rounded-xl flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <span className="font-medium text-sm">{item.name}</span>
                <span className="text-xs text-gray-500 ml-2">База: {Number(item.price)} ₽</span>
              </div>
              <input
                type="number"
                value={getDisplayValue(item.id)}
                onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                onBlur={() => saveValue(item.id)}
                placeholder="База"
                className="w-full sm:w-28 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                disabled={saving}
              />
              <span className={`text-xs ${hasOverride ? 'text-orange-400' : 'text-gray-500'}`}>
                {hasOverride ? 'Override' : 'По базе'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
