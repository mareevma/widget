export function createStore() {
  let state = {
    categoryId: null,
    fitId: null,
    materialId: null,
    colorId: null,
    printFrontId: null,
    printBackId: null,
    customizationIds: [],
    quantity: 100,
  };

  let data = {
    categories: [],
    fits: [],
    materials: [],
    productVariants: [],
    categoryFits: [],
    categoryMaterials: [],
    printMethods: [],
    categoryPrintMethods: [],
    customizations: [],
    categoryCustomizations: [],
    categoryCustomizationPrices: [],
    quantityTiers: [],
    colorPalettes: [],
  };

  const listeners = new Set();

  function getState() {
    return { ...state };
  }

  function update(partial) {
    state = { ...state, ...partial };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function setData(newData) {
    data = {
      categories: [],
      fits: [],
      materials: [],
      productVariants: [],
      categoryFits: [],
      categoryMaterials: [],
      printMethods: [],
      categoryPrintMethods: [],
      customizations: [],
      categoryCustomizations: [],
      categoryCustomizationPrices: [],
      quantityTiers: [],
      colorPalettes: [],
      ...newData,
    };
  }

  function getData() {
    return data;
  }

  /** Fits available for selected category (from product_variants) */
  function getAvailableFits() {
    if (!state.categoryId) return [];
    const mappedFitIds = data.categoryFits
      .filter((cf) => cf.category_id === state.categoryId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cf) => cf.fit_id);
    const fitIds = new Set(mappedFitIds);

    // Fallback for older data where mapping is not filled yet.
    if (fitIds.size === 0) {
      data.productVariants
        .filter((v) => v.category_id === state.categoryId)
        .forEach((v) => fitIds.add(v.fit_id));
    }

    return data.fits.filter((f) => fitIds.has(f.id));
  }

  /** Materials available for selected (category, fit) */
  function getAvailableMaterials() {
    if (!state.categoryId || !state.fitId) return [];
    const allowedByCategory = new Set(
      data.categoryMaterials
        .filter((cm) => cm.category_id === state.categoryId)
        .map((cm) => cm.material_id)
    );
    const allowedByVariant = new Set(
      data.productVariants
        .filter((v) => v.category_id === state.categoryId && v.fit_id === state.fitId)
        .map((v) => v.material_id)
    );

    const materialIds = new Set();
    if (allowedByCategory.size > 0) {
      for (const matId of allowedByCategory) {
        if (allowedByVariant.has(matId)) materialIds.add(matId);
      }
    } else {
      for (const matId of allowedByVariant) materialIds.add(matId);
    }

    return data.materials.filter((m) => materialIds.has(m.id));
  }

  /** Colors for selected material */
  function getAvailableColors() {
    if (!state.materialId) return [];
    const materialColors = data.colorPalettes.filter((c) => c.material_id === state.materialId);
    if (materialColors.length > 0) return materialColors;
    // Fallback for legacy/global palette rows where material_id is null.
    return data.colorPalettes.filter((c) => c.material_id == null);
  }

  /** Get the base price for current (category, fit, material) triple */
  function getBasePrice() {
    if (!state.categoryId || !state.fitId || !state.materialId) return 0;
    const variant = data.productVariants.find(
      (v) =>
        v.category_id === state.categoryId &&
        v.fit_id === state.fitId &&
        v.material_id === state.materialId
    );
    return variant ? Number(variant.base_price) : 0;
  }

  /** Get print method price by id */
  function getPrintPrice(printMethodId) {
    if (!printMethodId) return 0;
    const method = data.printMethods.find((m) => m.id === printMethodId);
    return method ? Number(method.price) : 0;
  }

  function getAvailablePrintMethods() {
    if (!state.categoryId) return data.printMethods;
    const boundIds = data.categoryPrintMethods
      .filter((x) => x.category_id === state.categoryId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((x) => x.print_method_id);
    if (boundIds.length === 0) return data.printMethods;
    const boundSet = new Set(boundIds);
    return data.printMethods.filter((m) => boundSet.has(m.id));
  }

  function getAvailableCustomizations() {
    if (!state.categoryId) return [];
    const boundIds = data.categoryCustomizations
      .filter((x) => x.category_id === state.categoryId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((x) => x.customization_id);
    if (boundIds.length === 0) return data.customizations;
    const boundSet = new Set(boundIds);
    return data.customizations.filter((c) => boundSet.has(c.id));
  }

  function getCustomizationsPrice(customizationIds = []) {
    if (!Array.isArray(customizationIds) || customizationIds.length === 0) return 0;
    const selected = new Set(customizationIds);
    const overrideMap = new Map(
      data.categoryCustomizationPrices
        .filter((x) => x.category_id === state.categoryId)
        .map((x) => [x.customization_id, Number(x.price)])
    );
    return data.customizations
      .filter((c) => selected.has(c.id))
      .reduce((sum, c) => sum + (overrideMap.has(c.id) ? overrideMap.get(c.id) : Number(c.price || 0)), 0);
  }

  /** Reset downstream selections when upstream changes */
  function selectCategory(categoryId) {
    update({
      categoryId,
      fitId: null,
      materialId: null,
      colorId: null,
      customizationIds: [],
    });
  }

  function selectFit(fitId) {
    update({ fitId, materialId: null, colorId: null });
  }

  function selectMaterial(materialId) {
    update({ materialId, colorId: null });
  }

  function toggleCustomization(customizationId, enabled) {
    const current = new Set(state.customizationIds || []);
    if (enabled) current.add(customizationId);
    else current.delete(customizationId);
    update({ customizationIds: Array.from(current) });
  }

  return {
    getState,
    update,
    subscribe,
    setData,
    getData,
    getAvailableFits,
    getAvailableMaterials,
    getAvailableColors,
    getAvailablePrintMethods,
    getAvailableCustomizations,
    getBasePrice,
    getPrintPrice,
    getCustomizationsPrice,
    selectCategory,
    selectFit,
    selectMaterial,
    toggleCustomization,
  };
}
