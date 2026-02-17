import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [options, setOptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState(null);
  const [optForm, setOptForm] = useState({ name: '', description: '', sort_order: 0, is_active: true, available_for_categories: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: o }, { data: c }] = await Promise.all([
      supabase.from('sections').select('*').order('sort_order'),
      supabase.from('options').select('*').order('sort_order'),
      supabase.from('categories').select('id, name').order('sort_order'),
    ]);
    setSections(s || []);
    setOptions(o || []);
    setCategories(c || []);
    if (!activeSectionId && s?.length) setActiveSectionId(s[0].id);
    setLoading(false);
  }

  const sectionOptions = options.filter(o => o.section_id === activeSectionId);

  function startNewOption() {
    setOptForm({ name: '', description: '', sort_order: sectionOptions.length, is_active: true, available_for_categories: categories.map(c => c.id) });
    setEditingOption('new');
  }

  function startEditOption(opt) {
    setOptForm({
      name: opt.name,
      description: opt.description || '',
      sort_order: opt.sort_order,
      is_active: opt.is_active,
      available_for_categories: opt.available_for_categories || [],
    });
    setEditingOption(opt);
  }

  async function saveOption() {
    if (!optForm.name.trim()) return;
    const payload = { ...optForm, section_id: activeSectionId };
    if (editingOption === 'new') {
      await supabase.from('options').insert(payload);
    } else {
      await supabase.from('options').update(payload).eq('id', editingOption.id);
    }
    setEditingOption(null);
    load();
  }

  async function removeOption(id) {
    if (!confirm('Удалить опцию?')) return;
    await supabase.from('options').delete().eq('id', id);
    load();
  }

  function toggleCategory(catId) {
    const cats = [...optForm.available_for_categories];
    const idx = cats.indexOf(catId);
    if (idx >= 0) cats.splice(idx, 1);
    else cats.push(catId);
    setOptForm({ ...optForm, available_for_categories: cats });
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Разделы и опции</h2>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => { setActiveSectionId(s.id); setEditingOption(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              s.id === activeSectionId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Options list */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Опции: {sections.find(s => s.id === activeSectionId)?.name}
        </h3>
        <button onClick={startNewOption} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить опцию
        </button>
      </div>

      {editingOption && (
        <div className="bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={optForm.name}
                onChange={e => setOptForm({ ...optForm, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Описание</label>
              <input
                value={optForm.description}
                onChange={e => setOptForm({ ...optForm, description: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={optForm.sort_order}
                onChange={e => setOptForm({ ...optForm, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-2">Доступна для категорий:</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    optForm.available_for_categories.includes(c.id)
                      ? 'bg-orange-500/30 text-orange-300 border border-orange-500'
                      : 'bg-gray-700 text-gray-400 border border-transparent'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveOption} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
              Сохранить
            </button>
            <button onClick={() => setEditingOption(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sectionOptions.map(opt => (
          <div key={opt.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{opt.name}</span>
              {opt.description && <span className="text-gray-500 text-xs ml-2">{opt.description}</span>}
              {!opt.is_active && <span className="ml-2 text-xs text-gray-500">(скрыта)</span>}
            </div>
            <div className="flex gap-1 flex-wrap">
              {(opt.available_for_categories || []).map(catId => {
                const cat = categories.find(c => c.id === catId);
                return cat ? <span key={catId} className="text-[10px] bg-gray-700 px-2 py-0.5 rounded">{cat.name}</span> : null;
              })}
            </div>
            <button onClick={() => startEditOption(opt)} className="text-gray-400 hover:text-white text-sm">
              Изменить
            </button>
            <button onClick={() => removeOption(opt.id)} className="text-red-400 hover:text-red-300 text-sm">
              Удалить
            </button>
          </div>
        ))}
        {sectionOptions.length === 0 && <p className="text-gray-500 text-sm">Нет опций</p>}
      </div>
    </div>
  );
}
