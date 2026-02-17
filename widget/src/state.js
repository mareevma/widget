export function createStore() {
  let state = {
    categoryId: null,
    fitId: null,
    materialId: null,
    colorId: null,
    printFrontId: null,
    printBackId: null,
    quantity: 100,
  };

  let data = {
    categories: [],
    fits: [],
    materials: [],
    productVariants: [],
    printMethods: [],
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
    data = newData;
  }

  function getData() {
    return data;
  }

  /** Fits available for selected category (from product_variants) */
  function getAvailableFits() {
    if (!state.categoryId) return [];
    const fitIds = new Set(
      data.productVariants
        .filter((v) => v.category_id === state.categoryId)
        .map((v) => v.fit_id)
    );
    return data.fits.filter((f) => fitIds.has(f.id));
  }

  /** Materials available for selected (category, fit) */
  function getAvailableMaterials() {
    if (!state.categoryId || !state.fitId) return [];
    const materialIds = new Set(
      data.productVariants
        .filter((v) => v.category_id === state.categoryId && v.fit_id === state.fitId)
        .map((v) => v.material_id)
    );
    return data.materials.filter((m) => materialIds.has(m.id));
  }

  /** Colors for selected material */
  function getAvailableColors() {
    if (!state.materialId) return [];
    return data.colorPalettes.filter((c) => c.material_id === state.materialId);
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

  /** Reset downstream selections when upstream changes */
  function selectCategory(categoryId) {
    update({ categoryId, fitId: null, materialId: null, colorId: null });
  }

  function selectFit(fitId) {
    update({ fitId, materialId: null, colorId: null });
  }

  function selectMaterial(materialId) {
    update({ materialId, colorId: null });
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
    getBasePrice,
    getPrintPrice,
    selectCategory,
    selectFit,
    selectMaterial,
  };
}
