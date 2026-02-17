import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function QuantityTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ min_qty: 1, max_qty: '', multiplier: 1.0, sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('quantity_tiers').select('*').order('sort_order');
    setTiers(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ min_qty: 1, max_qty: '', multiplier: 1.0, sort_order: tiers.length });
    setEditing('new');
  }

  function startEdit(tier) {
    setForm({
      min_qty: tier.min_qty,
      max_qty: tier.max_qty ?? '',
      multiplier: Number(tier.multiplier),
      sort_order: tier.sort_order,
    });
    setEditing(tier);
  }

  async function save() {
    const payload = {
      min_qty: form.min_qty,
      max_qty: form.max_qty === '' ? null : Number(form.max_qty),
      multiplier: form.multiplier,
      sort_order: form.sort_order,
    };
    if (editing === 'new') {
      await supabase.from('quantity_tiers').insert(payload);
    } else {
      await supabase.from('quantity_tiers').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить порог?')) return;
    await supabase.from('quantity_tiers').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Множители (тираж)</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить порог
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">От (шт)</label>
              <input
                type="number"
                value={form.min_qty}
                onChange={e => setForm({ ...form, min_qty: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">До (шт)</label>
              <input
                type="number"
                value={form.max_qty}
                placeholder="∞"
                onChange={e => setForm({ ...form, max_qty: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">Множитель</label>
              <input
                type="number"
                step="0.05"
                value={form.multiplier}
                onChange={e => setForm({ ...form, multiplier: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs text-left">
              <th className="pb-3 pr-4">Диапазон</th>
              <th className="pb-3 pr-4">Множитель</th>
              <th className="pb-3 pr-4">Пример (базовая 1550₽)</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(tier => (
              <tr key={tier.id} className="border-t border-gray-800">
                <td className="py-3 pr-4">
                  {tier.min_qty} — {tier.max_qty ?? '∞'} шт
                </td>
                <td className="py-3 pr-4 font-semibold">
                  ×{Number(tier.multiplier)}
                </td>
                <td className="py-3 pr-4 text-gray-400">
                  {Math.round(1550 * Number(tier.multiplier))} ₽/шт
                </td>
                <td className="py-3 text-right">
                  <button onClick={() => startEdit(tier)} className="text-gray-400 hover:text-white text-sm mr-3">Изменить</button>
                  <button onClick={() => remove(tier.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tiers.length === 0 && <p className="text-gray-500 text-sm mt-4">Нет порогов</p>}
      </div>
    </div>
  );
}
