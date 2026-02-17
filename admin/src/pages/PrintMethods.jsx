import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function PrintMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: 0, sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('print_methods').select('*').order('sort_order');
    setMethods(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', price: 0, sort_order: methods.length });
    setEditing('new');
  }

  function startEdit(m) {
    setForm({ name: m.name, price: Number(m.price), sort_order: m.sort_order });
    setEditing(m);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('print_methods').insert(form);
    } else {
      await supabase.from('print_methods').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить метод нанесения?')) return;
    await supabase.from('print_methods').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Методы нанесения</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-gray-400 text-xs mb-1">Цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
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

      <div className="space-y-2">
        {methods.map(m => (
          <div key={m.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{m.name}</span>
            </div>
            <span className="text-sm text-gray-400">{Number(m.price)} ₽</span>
            <span className="text-gray-500 text-xs">#{m.sort_order}</span>
            <button onClick={() => startEdit(m)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {methods.length === 0 && <p className="text-gray-500 text-sm">Нет методов</p>}
      </div>
    </div>
  );
}
