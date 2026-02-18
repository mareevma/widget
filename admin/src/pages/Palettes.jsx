import { useState, useEffect, useMemo } from 'react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabase';

function SortablePaletteRow({ color, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: color.id });
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
      className="bg-gray-800 p-3 rounded-xl flex items-center gap-3 w-full border border-gray-700 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="text-gray-500 text-lg leading-none" aria-hidden>::</span>
      <div className="w-8 h-8 rounded-full border-2 border-gray-600 overflow-hidden">
        {color.swatch_image_url
          ? <img src={color.swatch_image_url} alt={color.color_name} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: color.hex_code }} />}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium">{color.color_name}</span>
        <span className="text-xs text-gray-500 ml-2">{color.hex_code}</span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onEdit(color); }} className="text-gray-400 hover:text-white text-xs">Ред.</button>
      <button onClick={(e) => { e.stopPropagation(); onRemove(color.id); }} className="text-red-400 hover:text-red-300 text-xs">✕</button>
    </div>
  );
}

export default function Palettes() {
  const [palettes, setPalettes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeMaterialId, setActiveMaterialId] = useState('');
  const [copyFromMaterialId, setCopyFromMaterialId] = useState('');
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortMode, setSortMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState({
    material_id: '',
    color_name: '',
    hex_code: '#000000',
    swatch_image_url: '',
    is_active: true,
  });

  useEffect(() => { load(); }, []);

  function bySortOrder(a, b) {
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } })
  );

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('color_palettes').select('*').order('sort_order'),
      supabase.from('materials').select('id, name').order('sort_order'),
    ]);
    setPalettes(p || []);
    setMaterials(m || []);
    if (!activeMaterialId && m?.length) setActiveMaterialId(String(m[0].id));
    setLoading(false);
  }

  const visiblePalettes = activeMaterialId
    ? palettes.filter((p) => Number(p.material_id) === Number(activeMaterialId))
    : [];
  const sortedVisiblePalettes = useMemo(
    () => [...visiblePalettes].sort(bySortOrder),
    [visiblePalettes]
  );
  const activeMaterial = materials.find((m) => String(m.id) === String(activeMaterialId));

  function startNew() {
    const materialId = activeMaterialId ? Number(activeMaterialId) : '';
    setForm({
      material_id: materialId,
      color_name: '',
      hex_code: '#000000',
      swatch_image_url: '',
      is_active: true,
    });
    setEditing('new');
  }

  function startEdit(color) {
    setForm({
      material_id: color.material_id ?? '',
      color_name: color.color_name,
      hex_code: color.hex_code,
      swatch_image_url: color.swatch_image_url || '',
      is_active: color.is_active,
    });
    setEditing(color);
  }

  async function save() {
    if (!form.color_name.trim() || !form.material_id) return;
    const payload = {
      ...form,
      material_id: Number(form.material_id),
      sort_order:
        editing === 'new'
          ? palettes.filter((x) => Number(x.material_id) === Number(form.material_id)).length
          : editing.sort_order,
    };
    if (editing === 'new') {
      const { data } = await supabase.from('color_palettes').insert(payload).select('*').single();
      if (data) setPalettes((prev) => [...prev, data].sort(bySortOrder));
    } else {
      const { data } = await supabase.from('color_palettes').update(payload).eq('id', editing.id).select('*').single();
      if (data) setPalettes((prev) => prev.map((x) => (x.id === data.id ? data : x)).sort(bySortOrder));
    }
    setEditing(null);
  }

  async function remove(id) {
    if (!confirm('Удалить цвет?')) return;
    await supabase.from('color_palettes').delete().eq('id', id);
    setPalettes((prev) => prev.filter((x) => x.id !== id));
  }

  async function uploadSwatch(file) {
    if (!file) return;
    const materialId = Number(form.material_id || activeMaterialId);
    if (!materialId) return alert('Сначала выберите материал');
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const safeName = (form.color_name || 'swatch')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'swatch';
    const path = `swatches/material-${materialId}/${Date.now()}-${safeName}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, file);
    if (uploadErr) {
      alert(uploadErr.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    setForm((prev) => ({ ...prev, swatch_image_url: publicUrl }));
    setUploading(false);
  }

  async function copyPaletteFromMaterial() {
    const targetMaterialId = Number(activeMaterialId);
    const sourceMaterialId = Number(copyFromMaterialId);
    if (!targetMaterialId || !sourceMaterialId || targetMaterialId === sourceMaterialId) return;
    const sourceRows = palettes
      .filter((x) => Number(x.material_id) === sourceMaterialId)
      .map((x) => ({
        material_id: targetMaterialId,
        color_name: x.color_name,
        hex_code: x.hex_code,
        swatch_image_url: x.swatch_image_url || null,
        sort_order: x.sort_order,
        is_active: x.is_active,
      }));
    if (!confirm('Заменить текущую палитру выбранного материала палитрой из источника?')) return;
    setCopying(true);
    await supabase.from('color_palettes').delete().eq('material_id', targetMaterialId);
    if (sourceRows.length > 0) await supabase.from('color_palettes').insert(sourceRows);
    await load();
    setCopying(false);
  }

  async function savePaletteOrder(materialId, orderedRows) {
    setSavingOrder(true);
    await Promise.all(
      orderedRows.map((row, idx) =>
        supabase.from('color_palettes').update({ sort_order: idx }).eq('id', row.id).eq('material_id', materialId)
      )
    );
    setSavingOrder(false);
  }

  async function handleDragEnd(event) {
    const materialId = Number(activeMaterialId);
    const { active, over } = event;
    if (!materialId || !over || active.id === over.id) return;
    const oldIndex = sortedVisiblePalettes.findIndex((x) => x.id === active.id);
    const newIndex = sortedVisiblePalettes.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(sortedVisiblePalettes, oldIndex, newIndex);
    const reordered = moved.map((row, idx) => ({ ...row, sort_order: idx }));
    setPalettes((prev) => {
      const rest = prev.filter((x) => Number(x.material_id) !== materialId);
      return [...rest, ...reordered].sort(bySortOrder);
    });
    await savePaletteOrder(materialId, reordered);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Палитра цветов по материалам</h2>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Материал:</span>
          <select value={activeMaterialId} onChange={e => setActiveMaterialId(e.target.value)} className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm">
            {materials.map((mat) => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortMode((prev) => !prev)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${sortMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
            disabled={!activeMaterialId}
          >
            {sortMode ? 'Выйти из сортировки' : 'Режим сортировки'}
          </button>
          {!sortMode && (
            <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              + Добавить цвет
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-3 rounded-xl mb-4">
        <p className="text-xs text-gray-400 mb-2">Быстрое действие: копировать палитру вместе с фото-свотчами.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={copyFromMaterialId} onChange={(e) => setCopyFromMaterialId(e.target.value)} className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
            <option value="">Источник палитры</option>
            {materials.filter((m) => String(m.id) !== String(activeMaterialId)).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            disabled={copying || !copyFromMaterialId || !activeMaterialId}
            onClick={copyPaletteFromMaterial}
            className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-50 w-full sm:w-auto"
          >
            {copying ? 'Копирование...' : 'Копировать палитру'}
          </button>
        </div>
      </div>

      {editing && !sortMode && (
        <div className="bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full sm:w-56">
              <label className="block text-gray-400 text-xs mb-1">Материал</label>
              <select value={form.material_id} onChange={e => setForm({ ...form, material_id: e.target.value })} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Выберите материал</option>
                {materials.map((mat) => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название цвета</label>
              <input value={form.color_name} onChange={e => setForm({ ...form, color_name: e.target.value })} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="w-full sm:w-24">
              <label className="block text-gray-400 text-xs mb-1">Цвет</label>
              <input type="color" value={form.hex_code} onChange={e => setForm({ ...form, hex_code: e.target.value })} className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer" />
            </div>
            <div className="w-full sm:w-28">
              <label className="block text-gray-400 text-xs mb-1">HEX</label>
              <input value={form.hex_code} onChange={e => setForm({ ...form, hex_code: e.target.value })} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-gray-400 text-xs mb-1">Фото свотча (опционально)</label>
              <label className="block w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm cursor-pointer">
                {uploading ? 'Загрузка...' : 'Загрузить фото'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSwatch(e.target.files?.[0])} />
              </label>
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-gray-400 text-xs mb-1">Превью</label>
              <div className="h-10 rounded-lg border border-gray-600 overflow-hidden bg-gray-900">
                {form.swatch_image_url
                  ? <img src={form.swatch_image_url} alt="swatch" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: form.hex_code }} />}
              </div>
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
            <SortableContext items={sortedVisiblePalettes.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedVisiblePalettes.map((color) => (
                  <SortablePaletteRow key={color.id} color={color} onEdit={startEdit} onRemove={remove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="flex flex-wrap gap-3">
          {sortedVisiblePalettes.map((color) => (
            <div key={color.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-3 w-full sm:min-w-[200px] sm:w-auto">
              <div className="w-8 h-8 rounded-full border-2 border-gray-600 overflow-hidden">
                {color.swatch_image_url
                  ? <img src={color.swatch_image_url} alt={color.color_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: color.hex_code }} />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{color.color_name}</span>
                <span className="text-xs text-gray-500 ml-2">{color.hex_code}</span>
              </div>
              <button onClick={() => startEdit(color)} className="text-gray-400 hover:text-white text-xs">Ред.</button>
              <button onClick={() => remove(color.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          ))}
          {sortedVisiblePalettes.length === 0 && (
            <p className="text-gray-500 text-sm">
              {activeMaterial ? `Для материала "${activeMaterial.name}" палитра пока пустая` : 'Палитра пока пустая'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
