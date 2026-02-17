import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Pricing() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category_id: null, option_id: null, base_price: 0, price_type: 'fixed', tiers: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: c }, { data: o }] = await Promise.all([
      supabase.from('pricing_rules').select('*'),
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('options').select('id, name, section_id').order('sort_order'),
    ]);
    setRules(r || []);
    setCategories(c || []);
    setOptions(o || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ category_id: null, option_id: null, base_price: 0, price_type: 'fixed', tiers: [] });
    setEditing('new');
  }

  function startEdit(rule) {
    setForm({
      category_id: rule.category_id,
      option_id: rule.option_id,
      base_price: rule.base_price,
      price_type: rule.price_type,
      tiers: rule.tiers || [],
    });
    setEditing(rule);
  }

  async function save() {
    const payload = {
      ...form,
      tiers: form.price_type === 'tiered' ? form.tiers : null,
    };
    if (editing === 'new') {
      await supabase.from('pricing_rules').insert(payload);
    } else {
      await supabase.from('pricing_rules').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить правило?')) return;
    await supabase.from('pricing_rules').delete().eq('id', id);
    load();
  }

  function addTier() {
    setForm({ ...form, tiers: [...form.tiers, { min_qty: 1, max_qty: null, price: 0 }] });
  }

  function updateTier(idx, field, value) {
    const tiers = [...form.tiers];
    tiers[idx] = { ...tiers[idx], [field]: value === '' ? null : Number(value) };
    setForm({ ...form, tiers });
  }

  function removeTier(idx) {
    setForm({ ...form, tiers: form.tiers.filter((_, i) => i !== idx) });
  }

  function getName(rule) {
    if (rule.category_id && !rule.option_id) {
      return `Категория: ${categories.find(c => c.id === rule.category_id)?.name || rule.category_id}`;
    }
    if (rule.option_id) {
      return `Опция: ${options.find(o => o.id === rule.option_id)?.name || rule.option_id}`;
    }
    return 'Общее правило';
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Ценообразование</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить правило
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6 space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Категория (необяз.)</label>
              <select
                value={form.category_id || ''}
                onChange={e => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Не выбрана —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Опция (необяз.)</label>
              <select
                value={form.option_id || ''}
                onChange={e => setForm({ ...form, option_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Не выбрана —</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-32">
              <label className="block text-gray-400 text-xs mb-1">Базовая цена</label>
              <input
                type="number"
                value={form.base_price}
                onChange={e => setForm({ ...form, base_price: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-40">
              <label className="block text-gray-400 text-xs mb-1">Тип</label>
              <select
                value={form.price_type}
                onChange={e => setForm({ ...form, price_type: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="fixed">Фиксированная</option>
                <option value="per_unit">За единицу</option>
                <option value="tiered">Пороговая (тираж)</option>
              </select>
            </div>
          </div>

          {form.price_type === 'tiered' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs">Пороги:</label>
                <button onClick={addTier} className="text-orange-400 hover:text-orange-300 text-xs">+ Добавить порог</button>
              </div>
              {form.tiers.map((tier, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <input type="number" placeholder="от" value={tier.min_qty} onChange={e => updateTier(idx, 'min_qty', e.target.value)}
                    className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">—</span>
                  <input type="number" placeholder="до (пусто = ∞)" value={tier.max_qty ?? ''} onChange={e => updateTier(idx, 'max_qty', e.target.value)}
                    className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">шт →</span>
                  <input type="number" placeholder="цена" value={tier.price} onChange={e => updateTier(idx, 'price', e.target.value)}
                    className="w-24 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">₽</span>
                  <button onClick={() => removeTier(idx)} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{getName(rule)}</span>
            </div>
            <span className="text-sm text-gray-400">{rule.base_price} ₽</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">{rule.price_type}</span>
            <button onClick={() => startEdit(rule)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(rule.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-gray-500 text-sm">Нет правил</p>}
      </div>
    </div>
  );
}
