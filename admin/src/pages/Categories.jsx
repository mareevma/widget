import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | category object
  const [form, setForm] = useState({ name: '', sort_order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', sort_order: categories.length, is_active: true });
    setEditing('new');
  }

  function startEdit(cat) {
    setForm({ name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active });
    setEditing(cat);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('categories').insert(form);
    } else {
      await supabase.from('categories').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить категорию?')) return;
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  async function uploadImage(catId, file) {
    setUploading(true);
    const path = `categories/${catId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, file);
    if (uploadErr) { alert(uploadErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    await supabase.from('categories').update({ image_url: publicUrl }).eq('id', catId);
    setUploading(false);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Категории</h2>
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
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="accent-orange-500"
              />
              Активна
            </label>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
              Сохранить
            </button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="bg-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              {cat.image_url
                ? <img src={cat.image_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">—</div>
              }
            </div>
            <div className="flex-1">
              <span className="font-medium">{cat.name}</span>
              {!cat.is_active && <span className="ml-2 text-xs text-gray-500">(скрыта)</span>}
            </div>
            <span className="text-gray-500 text-xs">#{cat.sort_order}</span>
            <label className="text-xs text-gray-400 cursor-pointer hover:text-orange-400">
              {uploading ? '...' : 'Фото'}
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                if (e.target.files[0]) uploadImage(cat.id, e.target.files[0]);
              }} />
            </label>
            <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-white text-sm">
              Изменить
            </button>
            <button onClick={() => remove(cat.id)} className="text-red-400 hover:text-red-300 text-sm">
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
