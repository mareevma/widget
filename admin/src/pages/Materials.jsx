import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('materials').select('*').order('sort_order');
    setMaterials(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', description: '', sort_order: materials.length });
    setEditing('new');
  }

  function startEdit(mat) {
    setForm({ name: mat.name, description: mat.description || '', sort_order: mat.sort_order });
    setEditing(mat);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('materials').insert(form);
    } else {
      await supabase.from('materials').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить материал? Это удалит все связанные варианты и палитры.')) return;
    await supabase.from('materials').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Материалы</h2>
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
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Описание</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
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
        {materials.map(mat => (
          <div key={mat.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{mat.name}</span>
              {mat.description && <span className="text-gray-500 text-xs ml-2">{mat.description}</span>}
            </div>
            <span className="text-gray-500 text-xs">#{mat.sort_order}</span>
            <button onClick={() => startEdit(mat)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(mat.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {materials.length === 0 && <p className="text-gray-500 text-sm">Нет материалов</p>}
      </div>
    </div>
  );
}
