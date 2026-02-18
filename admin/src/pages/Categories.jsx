import { useState, useEffect, useMemo } from 'react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabase';

function SortableCategoryRow({ cat, onUploadImage, uploading }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 p-4 rounded-xl flex items-center gap-3 border border-gray-700 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="text-gray-500 text-lg leading-none" aria-hidden>
        ::
      </span>
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
      <label className="text-xs text-gray-400 cursor-pointer hover:text-orange-400">
        {uploading ? '...' : 'Фото'}
        <input type="file" accept="image/*" className="hidden" onChange={e => {
          e.stopPropagation();
          if (e.target.files?.[0]) onUploadImage(cat.id, e.target.files[0]);
        }} />
      </label>
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | category object
  const [form, setForm] = useState({ name: '', is_active: true });
  const [uploading, setUploading] = useState(false);
  const [sortMode, setSortMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } })
  );

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', is_active: true });
    setEditing('new');
  }

  function startEdit(cat) {
    setForm({ name: cat.name, is_active: cat.is_active });
    setEditing(cat);
  }

  function bySortOrder(a, b) {
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      const payload = { ...form, sort_order: categories.length };
      const { data } = await supabase.from('categories').insert(payload).select('*').single();
      if (data) setCategories((prev) => [...prev, data].sort(bySortOrder));
    } else {
      const { data } = await supabase.from('categories').update(form).eq('id', editing.id).select('*').single();
      if (data) setCategories((prev) => prev.map((x) => (x.id === data.id ? data : x)).sort(bySortOrder));
    }
    setEditing(null);
  }

  async function remove(id) {
    if (!confirm('Удалить категорию?')) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((x) => x.id !== id));
  }

  async function uploadImage(catId, file) {
    setUploading(true);
    const path = `categories/${catId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, file);
    if (uploadErr) { alert(uploadErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    await supabase.from('categories').update({ image_url: publicUrl }).eq('id', catId);
    setUploading(false);
    setCategories((prev) => prev.map((x) => (x.id === catId ? { ...x, image_url: publicUrl } : x)));
  }

  async function saveOrder(nextRows) {
    setSavingOrder(true);
    await Promise.all(
      nextRows.map((row, idx) =>
        supabase.from('categories').update({ sort_order: idx }).eq('id', row.id)
      )
    );
    setSavingOrder(false);
  }

  const sortedCategories = useMemo(
    () => [...categories].sort(bySortOrder),
    [categories]
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedCategories.findIndex((x) => x.id === active.id);
    const newIndex = sortedCategories.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(sortedCategories, oldIndex, newIndex);
    const ordered = moved.map((row, idx) => ({ ...row, sort_order: idx }));
    setCategories(ordered);
    await saveOrder(ordered);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold">Категории</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortMode((prev) => !prev)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${sortMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            {sortMode ? 'Выйти из сортировки' : 'Режим сортировки'}
          </button>
          {!sortMode && (
            <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              + Добавить
            </button>
          )}
        </div>
      </div>

      {editing && !sortMode && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
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
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto">
              Сохранить
            </button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm w-full sm:w-auto">
              Отмена
            </button>
          </div>
        </div>
      )}

      {sortMode && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2 mb-3 text-xs text-gray-400">
          Перетаскивайте карточки, чтобы менять порядок. {savingOrder ? 'Сохраняем...' : ''}
        </div>
      )}

      {sortMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedCategories.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedCategories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  cat={cat}
                  uploading={uploading}
                  onUploadImage={uploadImage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {sortedCategories.map(cat => (
            <div key={cat.id} className="bg-gray-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
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
              <label className="text-xs text-gray-400 cursor-pointer hover:text-orange-400">
                {uploading ? '...' : 'Фото'}
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  if (e.target.files?.[0]) uploadImage(cat.id, e.target.files[0]);
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
      )}
    </div>
  );
}
