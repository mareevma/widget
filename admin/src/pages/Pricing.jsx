import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Pricing() {
  const [categories, setCategories] = useState([]);
  const [fits, setFits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categoryFits, setCategoryFits] = useState([]);
  const [categoryMaterials, setCategoryMaterials] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null); // { fitId, materialId }
  const [cellPrice, setCellPrice] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: f }, { data: m }, { data: v }, { data: cf }, { data: cm }] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('fits').select('id, name, sort_order, is_active').eq('is_active', true).order('sort_order'),
      supabase.from('materials').select('id, name, sort_order, is_active').eq('is_active', true).order('sort_order'),
      supabase.from('product_variants').select('*'),
      supabase.from('category_fits').select('*'),
      supabase.from('category_materials').select('*'),
    ]);
    setCategories(c || []);
    setFits(f || []);
    setMaterials(m || []);
    setVariants(v || []);
    setCategoryFits(cf || []);
    setCategoryMaterials(cm || []);
    if (!activeCategoryId && c?.length) setActiveCategoryId(c[0].id);
    setLoading(false);
  }

  function getVariant(fitId, materialId) {
    return variants.find(
      (v) => v.category_id === activeCategoryId && v.fit_id === fitId && v.material_id === materialId
    );
  }

  function startEditCell(fitId, materialId) {
    const existing = getVariant(fitId, materialId);
    setCellPrice(existing ? String(Number(existing.base_price)) : '');
    setEditingCell({ fitId, materialId });
  }

  async function saveCell() {
    if (!editingCell) return;
    const { fitId, materialId } = editingCell;
    const existing = getVariant(fitId, materialId);
    const price = cellPrice.trim();

    if (price === '' && existing) {
      // Remove variant
      await supabase.from('product_variants').delete().eq('id', existing.id);
    } else if (price !== '' && !existing) {
      // Create variant
      await supabase.from('product_variants').insert({
        category_id: activeCategoryId,
        fit_id: fitId,
        material_id: materialId,
        base_price: Number(price),
      });
    } else if (price !== '' && existing && Number(price) !== Number(existing.base_price)) {
      // Update variant
      await supabase.from('product_variants').update({ base_price: Number(price) }).eq('id', existing.id);
    }

    setEditingCell(null);
    load();
  }

  function handleCellKeyDown(e) {
    if (e.key === 'Enter') saveCell();
    if (e.key === 'Escape') setEditingCell(null);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  // Show only fits/materials explicitly bound to this category.
  const categoryVariants = variants.filter((v) => v.category_id === activeCategoryId);
  const fitIds = new Set(
    categoryFits.filter((x) => x.category_id === activeCategoryId).map((x) => x.fit_id)
  );
  const materialIds = new Set(
    categoryMaterials.filter((x) => x.category_id === activeCategoryId).map((x) => x.material_id)
  );
  const displayFits = fits.filter((f) => fitIds.has(f.id));
  const displayMaterials = materials.filter((m) => materialIds.has(m.id));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Цены (матрица)</h2>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveCategoryId(c.id); setEditingCell(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              c.id === activeCategoryId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Кликните на ячейку, чтобы задать цену. Пустое поле = комбинация недоступна. Состав строк/колонок
        настраивается в разделе "Товары: структура".
      </p>

      {/* Matrix table */}
      <div className="max-w-full rounded-xl border border-gray-800 overflow-x-auto">
        {displayFits.length === 0 || displayMaterials.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-300">
            Для этой категории не заданы фасоны или материалы. Сначала настройте их в разделе
            "Товары: структура".
          </div>
        ) : (
        <table className="w-max min-w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-400 text-xs pb-3 pr-4 sticky left-0 bg-gray-900 z-10">
                Фасон ↓ / Материал →
              </th>
              {displayMaterials.map(m => (
                <th key={m.id} className="text-center text-gray-400 text-xs pb-3 px-2 min-w-[100px]">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayFits.map(fit => (
              <tr key={fit.id} className="border-t border-gray-800">
                <td className="py-2 pr-4 font-medium text-sm sticky left-0 bg-gray-900 z-10">
                  {fit.name}
                </td>
                {displayMaterials.map(mat => {
                  const variant = getVariant(fit.id, mat.id);
                  const isEditing = editingCell?.fitId === fit.id && editingCell?.materialId === mat.id;

                  return (
                    <td key={mat.id} className="py-2 px-2 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={cellPrice}
                          onChange={e => setCellPrice(e.target.value)}
                          onBlur={saveCell}
                          onKeyDown={handleCellKeyDown}
                          placeholder="—"
                          className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEditCell(fit.id, mat.id)}
                          className={`w-20 py-1 rounded text-sm transition-colors ${
                            variant
                              ? 'bg-gray-800 text-white hover:bg-gray-700 font-semibold'
                              : 'bg-transparent text-gray-600 hover:bg-gray-800 hover:text-gray-400'
                          }`}
                        >
                          {variant ? `${Number(variant.base_price)}` : '—'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {categoryVariants.length > 0 && (
        <p className="text-gray-500 text-xs mt-4">
          {categoryVariants.length} вариант(ов) для этой категории
        </p>
      )}
    </div>
  );
}
