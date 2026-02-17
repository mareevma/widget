import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Palettes() {
  const [palettes, setPalettes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ color_name: '', hex_code: '#000000', sort_order: 0, is_active: true });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('materials').select('id, name').order('sort_order'),
      supabase.from('color_palettes').select('*').order('sort_order'),
    ]);
    setMaterials(m || []);
    setPalettes(p || []);
    if (!activeMaterialId && m?.length) setActiveMaterialId(m[0].id);
    setLoading(false);
  }

  const materialColors = palettes.filter(p => p.material_id === activeMaterialId);

  function startNew() {
    setForm({ color_name: '', hex_code: '#000000', sort_order: materialColors.length, is_active: true });
    setEditing('new');
  }

  function startEdit(color) {
    setForm({ color_name: color.color_name, hex_code: color.hex_code, sort_order: color.sort_order, is_active: color.is_active });
    setEditing(color);
  }

  async function save() {
    if (!form.color_name.trim()) return;
    const payload = { ...form, material_id: activeMaterialId };
    if (editing === 'new') {
      await supabase.from('color_palettes').insert(payload);
    } else {
      await supabase.from('color_palettes').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить цвет?')) return;
    await supabase.from('color_palettes').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Палитры цветов</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {materials.map(m => (
          <button
            key={m.id}
            onClick={() => { setActiveMaterialId(m.id); setEditing(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              m.id === activeMaterialId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Цвета: {materials.find(m => m.id === activeMaterialId)?.name}</h3>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить цвет
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название цвета</label>
              <input
                value={form.color_name}
                onChange={e => setForm({ ...form, color_name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Цвет</label>
              <input
                type="color"
                value={form.hex_code}
                onChange={e => setForm({ ...form, hex_code: e.target.value })}
                className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">HEX</label>
              <input
                value={form.hex_code}
                onChange={e => setForm({ ...form, hex_code: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-20">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {materialColors.map(color => (
          <div key={color.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-3 min-w-[200px]">
            <div className="w-8 h-8 rounded-full border-2 border-gray-600" style={{ background: color.hex_code }} />
            <div className="flex-1">
              <span className="text-sm font-medium">{color.color_name}</span>
              <span className="text-xs text-gray-500 ml-2">{color.hex_code}</span>
            </div>
            <button onClick={() => startEdit(color)} className="text-gray-400 hover:text-white text-xs">Ред.</button>
            <button onClick={() => remove(color.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        ))}
        {materialColors.length === 0 && <p className="text-gray-500 text-sm">Нет цветов для этого материала</p>}
      </div>
    </div>
  );
}
