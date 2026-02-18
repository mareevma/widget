import { useState, useEffect, useMemo } from 'react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabase';

function SortableFitRow({ fit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fit.id });
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
      className="bg-gray-800 p-3 rounded-xl flex items-center gap-3 border border-gray-700 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="text-gray-500 text-lg leading-none" aria-hidden>::</span>
      <div className="flex-1">
        <span className="font-medium text-sm">{fit.name}</span>
      </div>
    </div>
  );
}

export default function Fits() {
  const [fits, setFits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [sortMode, setSortMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('fits').select('*').order('sort_order');
    setFits(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '' });
    setEditing('new');
  }

  function startEdit(fit) {
    setForm({ name: fit.name });
    setEditing(fit);
  }

  function bySortOrder(a, b) {
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  }

  const sortedFits = useMemo(
    () => [...fits].sort(bySortOrder),
    [fits]
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } })
  );

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      const payload = { ...form, sort_order: fits.length };
      const { data } = await supabase.from('fits').insert(payload).select('*').single();
      if (data) setFits((prev) => [...prev, data].sort(bySortOrder));
    } else {
      const { data } = await supabase.from('fits').update(form).eq('id', editing.id).select('*').single();
      if (data) setFits((prev) => prev.map((x) => (x.id === data.id ? data : x)).sort(bySortOrder));
    }
    setEditing(null);
  }

  async function remove(id) {
    if (!confirm('Удалить фасон? Это удалит все связанные варианты товаров.')) return;
    await supabase.from('fits').delete().eq('id', id);
    setFits((prev) => prev.filter((x) => x.id !== id));
  }

  async function saveOrder(nextRows) {
    setSavingOrder(true);
    await Promise.all(
      nextRows.map((row, idx) =>
        supabase.from('fits').update({ sort_order: idx }).eq('id', row.id)
      )
    );
    setSavingOrder(false);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedFits.findIndex((x) => x.id === active.id);
    const newIndex = sortedFits.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(sortedFits, oldIndex, newIndex);
    const ordered = moved.map((row, idx) => ({ ...row, sort_order: idx }));
    setFits(ordered);
    await saveOrder(ordered);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold">Фасоны</h2>
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
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm w-full sm:w-auto">Отмена</button>
          </div>
        </div>
      )}

      {sortMode ? (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2 mb-3 text-xs text-gray-400">
            Перетаскивайте карточки, чтобы менять порядок. {savingOrder ? 'Сохраняем...' : ''}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedFits.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedFits.map((fit) => (
                  <SortableFitRow key={fit.id} fit={fit} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="space-y-2">
          {sortedFits.map(fit => (
            <div key={fit.id} className="bg-gray-800 p-3 rounded-xl flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <span className="font-medium text-sm">{fit.name}</span>
              </div>
              <button onClick={() => startEdit(fit)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
              <button onClick={() => remove(fit.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
            </div>
          ))}
          {fits.length === 0 && <p className="text-gray-500 text-sm">Нет фасонов</p>}
        </div>
      )}
    </div>
  );
}
