import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

export default function ProductSetup() {
  const [categories, setCategories] = useState([]);
  const [fits, setFits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [categoryFits, setCategoryFits] = useState([]);
  const [categoryMaterials, setCategoryMaterials] = useState([]);
  const [printMethods, setPrintMethods] = useState([]);
  const [categoryPrintMethods, setCategoryPrintMethods] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [categoryCustomizations, setCategoryCustomizations] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fitQuery, setFitQuery] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const [copyFromCategoryId, setCopyFromCategoryId] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: f }, { data: m }, { data: cf }, { data: cm }, { data: pm }, { data: cpm }, { data: cu }, { data: ccu }] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('fits').select('id, name, sort_order').order('sort_order'),
      supabase.from('materials').select('id, name, sort_order').order('sort_order'),
      supabase.from('category_fits').select('*'),
      supabase.from('category_materials').select('*'),
      supabase.from('print_methods').select('id, name, sort_order').order('sort_order'),
      supabase.from('category_print_methods').select('*'),
      supabase.from('customizations').select('id, name, sort_order').eq('is_active', true).order('sort_order'),
      supabase.from('category_customizations').select('*'),
    ]);

    setCategories(c || []);
    setFits(f || []);
    setMaterials(m || []);
    setCategoryFits(cf || []);
    setCategoryMaterials(cm || []);
    setPrintMethods(pm || []);
    setCategoryPrintMethods(cpm || []);
    setCustomizations(cu || []);
    setCategoryCustomizations(ccu || []);
    if (!activeCategoryId && c?.length) setActiveCategoryId(c[0].id);
    setLoading(false);
  }

  const selectedFitIds = useMemo(() => {
    return new Set(
      categoryFits.filter((x) => x.category_id === activeCategoryId).map((x) => x.fit_id)
    );
  }, [categoryFits, activeCategoryId]);

  const selectedMaterialIds = useMemo(() => {
    return new Set(
      categoryMaterials.filter((x) => x.category_id === activeCategoryId).map((x) => x.material_id)
    );
  }, [categoryMaterials, activeCategoryId]);

  const selectedPrintMethodIds = useMemo(() => {
    return new Set(
      categoryPrintMethods.filter((x) => x.category_id === activeCategoryId).map((x) => x.print_method_id)
    );
  }, [categoryPrintMethods, activeCategoryId]);

  const selectedCustomizationIds = useMemo(() => {
    return new Set(
      categoryCustomizations.filter((x) => x.category_id === activeCategoryId).map((x) => x.customization_id)
    );
  }, [categoryCustomizations, activeCategoryId]);

  const filteredFits = useMemo(() => {
    const q = fitQuery.trim().toLowerCase();
    if (!q) return fits;
    return fits.filter((fit) => fit.name.toLowerCase().includes(q));
  }, [fits, fitQuery]);

  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((mat) => mat.name.toLowerCase().includes(q));
  }, [materials, materialQuery]);

  async function toggleFit(fitId, enabled) {
    if (!activeCategoryId) return;
    setSaving(true);
    if (enabled) {
      await supabase.from('category_fits').upsert(
        { category_id: activeCategoryId, fit_id: fitId, sort_order: fits.find((x) => x.id === fitId)?.sort_order ?? 0 },
        { onConflict: 'category_id,fit_id' }
      );
    } else {
      await supabase
        .from('category_fits')
        .delete()
        .eq('category_id', activeCategoryId)
        .eq('fit_id', fitId);
    }
    setCategoryFits((prev) => {
      const next = prev.filter((x) => !(x.category_id === activeCategoryId && x.fit_id === fitId));
      if (enabled) {
        next.push({
          category_id: activeCategoryId,
          fit_id: fitId,
          sort_order: fits.find((x) => x.id === fitId)?.sort_order ?? 0,
        });
      }
      return next;
    });
    setSaving(false);
  }

  async function toggleMaterial(materialId, enabled) {
    if (!activeCategoryId) return;
    setSaving(true);
    if (enabled) {
      await supabase.from('category_materials').upsert(
        {
          category_id: activeCategoryId,
          material_id: materialId,
          sort_order: materials.find((x) => x.id === materialId)?.sort_order ?? 0,
        },
        { onConflict: 'category_id,material_id' }
      );
    } else {
      await supabase
        .from('category_materials')
        .delete()
        .eq('category_id', activeCategoryId)
        .eq('material_id', materialId);
    }
    setCategoryMaterials((prev) => {
      const next = prev.filter((x) => !(x.category_id === activeCategoryId && x.material_id === materialId));
      if (enabled) {
        next.push({
          category_id: activeCategoryId,
          material_id: materialId,
          sort_order: materials.find((x) => x.id === materialId)?.sort_order ?? 0,
        });
      }
      return next;
    });
    setSaving(false);
  }

  async function setAllFits(enabled) {
    if (!activeCategoryId || fits.length === 0) return;
    setSaving(true);
    if (enabled) {
      const payload = fits.map((fit) => ({
        category_id: activeCategoryId,
        fit_id: fit.id,
        sort_order: fit.sort_order ?? 0,
      }));
      await supabase.from('category_fits').upsert(payload, { onConflict: 'category_id,fit_id' });
    } else {
      await supabase.from('category_fits').delete().eq('category_id', activeCategoryId);
    }
    setCategoryFits((prev) => {
      const next = prev.filter((x) => x.category_id !== activeCategoryId);
      if (!enabled) return next;
      return [
        ...next,
        ...fits.map((fit) => ({
          category_id: activeCategoryId,
          fit_id: fit.id,
          sort_order: fit.sort_order ?? 0,
        })),
      ];
    });
    setSaving(false);
  }

  async function setAllMaterials(enabled) {
    if (!activeCategoryId || materials.length === 0) return;
    setSaving(true);
    if (enabled) {
      const payload = materials.map((material) => ({
        category_id: activeCategoryId,
        material_id: material.id,
        sort_order: material.sort_order ?? 0,
      }));
      await supabase.from('category_materials').upsert(payload, { onConflict: 'category_id,material_id' });
    } else {
      await supabase.from('category_materials').delete().eq('category_id', activeCategoryId);
    }
    setCategoryMaterials((prev) => {
      const next = prev.filter((x) => x.category_id !== activeCategoryId);
      if (!enabled) return next;
      return [
        ...next,
        ...materials.map((material) => ({
          category_id: activeCategoryId,
          material_id: material.id,
          sort_order: material.sort_order ?? 0,
        })),
      ];
    });
    setSaving(false);
  }

  async function togglePrintMethod(printMethodId, enabled) {
    if (!activeCategoryId) return;
    setSaving(true);
    if (enabled) {
      await supabase.from('category_print_methods').upsert(
        { category_id: activeCategoryId, print_method_id: printMethodId, sort_order: printMethods.find((x) => x.id === printMethodId)?.sort_order ?? 0 },
        { onConflict: 'category_id,print_method_id' }
      );
    } else {
      await supabase
        .from('category_print_methods')
        .delete()
        .eq('category_id', activeCategoryId)
        .eq('print_method_id', printMethodId);
    }
    setCategoryPrintMethods((prev) => {
      const next = prev.filter((x) => !(x.category_id === activeCategoryId && x.print_method_id === printMethodId));
      if (enabled) {
        next.push({
          category_id: activeCategoryId,
          print_method_id: printMethodId,
          sort_order: printMethods.find((x) => x.id === printMethodId)?.sort_order ?? 0,
        });
      }
      return next;
    });
    setSaving(false);
  }

  async function toggleCustomization(customizationId, enabled) {
    if (!activeCategoryId) return;
    setSaving(true);
    if (enabled) {
      await supabase.from('category_customizations').upsert(
        { category_id: activeCategoryId, customization_id: customizationId, sort_order: customizations.find((x) => x.id === customizationId)?.sort_order ?? 0 },
        { onConflict: 'category_id,customization_id' }
      );
    } else {
      await supabase
        .from('category_customizations')
        .delete()
        .eq('category_id', activeCategoryId)
        .eq('customization_id', customizationId);
    }
    setCategoryCustomizations((prev) => {
      const next = prev.filter((x) => !(x.category_id === activeCategoryId && x.customization_id === customizationId));
      if (enabled) {
        next.push({
          category_id: activeCategoryId,
          customization_id: customizationId,
          sort_order: customizations.find((x) => x.id === customizationId)?.sort_order ?? 0,
        });
      }
      return next;
    });
    setSaving(false);
  }

  async function copyBindingsFromCategory() {
    const sourceCategoryId = Number(copyFromCategoryId);
    if (!activeCategoryId || !sourceCategoryId || sourceCategoryId === activeCategoryId) return;

    setSaving(true);
    const sourceFits = categoryFits
      .filter((x) => x.category_id === sourceCategoryId)
      .map((x) => ({
        category_id: activeCategoryId,
        fit_id: x.fit_id,
        sort_order: x.sort_order ?? 0,
      }));
    const sourceMaterials = categoryMaterials
      .filter((x) => x.category_id === sourceCategoryId)
      .map((x) => ({
        category_id: activeCategoryId,
        material_id: x.material_id,
        sort_order: x.sort_order ?? 0,
      }));
    const sourcePrintMethods = categoryPrintMethods
      .filter((x) => x.category_id === sourceCategoryId)
      .map((x) => ({
        category_id: activeCategoryId,
        print_method_id: x.print_method_id,
        sort_order: x.sort_order ?? 0,
      }));
    const sourceCustomizations = categoryCustomizations
      .filter((x) => x.category_id === sourceCategoryId)
      .map((x) => ({
        category_id: activeCategoryId,
        customization_id: x.customization_id,
        sort_order: x.sort_order ?? 0,
      }));

    await supabase.from('category_fits').delete().eq('category_id', activeCategoryId);
    await supabase.from('category_materials').delete().eq('category_id', activeCategoryId);
    await supabase.from('category_print_methods').delete().eq('category_id', activeCategoryId);
    await supabase.from('category_customizations').delete().eq('category_id', activeCategoryId);

    if (sourceFits.length > 0) {
      await supabase.from('category_fits').insert(sourceFits);
    }
    if (sourceMaterials.length > 0) {
      await supabase.from('category_materials').insert(sourceMaterials);
    }
    if (sourcePrintMethods.length > 0) {
      await supabase.from('category_print_methods').insert(sourcePrintMethods);
    }
    if (sourceCustomizations.length > 0) {
      await supabase.from('category_customizations').insert(sourceCustomizations);
    }

    setCategoryFits((prev) => [
      ...prev.filter((x) => x.category_id !== activeCategoryId),
      ...sourceFits,
    ]);
    setCategoryMaterials((prev) => [
      ...prev.filter((x) => x.category_id !== activeCategoryId),
      ...sourceMaterials,
    ]);
    setCategoryPrintMethods((prev) => [
      ...prev.filter((x) => x.category_id !== activeCategoryId),
      ...sourcePrintMethods,
    ]);
    setCategoryCustomizations((prev) => [
      ...prev.filter((x) => x.category_id !== activeCategoryId),
      ...sourceCustomizations,
    ]);
    setSaving(false);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Товары: структура</h2>
      <p className="text-gray-500 text-sm mb-6">
        Выберите категорию и отметьте, какие фасоны и материалы доступны в конфигураторе.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cat.id === activeCategoryId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <p className="text-xs text-gray-400 mb-3">
          Быстрое действие: скопировать фасоны и материалы из другой категории в текущую.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={copyFromCategoryId}
            onChange={(e) => setCopyFromCategoryId(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[220px]"
          >
            <option value="">Выберите категорию-источник</option>
            {categories
              .filter((cat) => cat.id !== activeCategoryId)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
          <button
            disabled={saving || !copyFromCategoryId}
            onClick={copyBindingsFromCategory}
            className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm disabled:opacity-50"
          >
            Копировать в текущую категорию
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">Фасоны для товара</h3>
            <span className="text-xs text-gray-400">{selectedFitIds.size}/{fits.length}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              disabled={saving}
              onClick={() => setAllFits(true)}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs disabled:opacity-50"
            >
              Выбрать все
            </button>
            <button
              disabled={saving}
              onClick={() => setAllFits(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs disabled:opacity-50"
            >
              Очистить
            </button>
          </div>
          <input
            value={fitQuery}
            onChange={(e) => setFitQuery(e.target.value)}
            placeholder="Поиск фасона..."
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="space-y-2">
            {filteredFits.map((fit) => {
              const checked = selectedFitIds.has(fit.id);
              return (
                <label key={fit.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={checked}
                    onChange={(e) => toggleFit(fit.id, e.target.checked)}
                  />
                  <span>{fit.name}</span>
                </label>
              );
            })}
            {filteredFits.length === 0 && (
              <p className="text-xs text-gray-500">Ничего не найдено</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">Материалы для товара</h3>
            <span className="text-xs text-gray-400">{selectedMaterialIds.size}/{materials.length}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              disabled={saving}
              onClick={() => setAllMaterials(true)}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs disabled:opacity-50"
            >
              Выбрать все
            </button>
            <button
              disabled={saving}
              onClick={() => setAllMaterials(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs disabled:opacity-50"
            >
              Очистить
            </button>
          </div>
          <input
            value={materialQuery}
            onChange={(e) => setMaterialQuery(e.target.value)}
            placeholder="Поиск материала..."
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="space-y-2">
            {filteredMaterials.map((mat) => {
              const checked = selectedMaterialIds.has(mat.id);
              return (
                <label key={mat.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={checked}
                    onChange={(e) => toggleMaterial(mat.id, e.target.checked)}
                  />
                  <span>{mat.name}</span>
                </label>
              );
            })}
            {filteredMaterials.length === 0 && (
              <p className="text-xs text-gray-500">Ничего не найдено</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">Нанесения для товара</h3>
            <span className="text-xs text-gray-400">{selectedPrintMethodIds.size}/{printMethods.length}</span>
          </div>
          <div className="space-y-2">
            {printMethods.map((method) => {
              const checked = selectedPrintMethodIds.has(method.id);
              return (
                <label key={method.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={checked}
                    onChange={(e) => togglePrintMethod(method.id, e.target.checked)}
                    disabled={saving}
                  />
                  <span>{method.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">Кастомизации для товара</h3>
            <span className="text-xs text-gray-400">{selectedCustomizationIds.size}/{customizations.length}</span>
          </div>
          <div className="space-y-2">
            {customizations.map((item) => {
              const checked = selectedCustomizationIds.has(item.id);
              return (
                <label key={item.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={checked}
                    onChange={(e) => toggleCustomization(item.id, e.target.checked)}
                    disabled={saving}
                  />
                  <span>{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
