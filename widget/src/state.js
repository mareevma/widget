export function createStore() {
  let state = {
    categoryId: null,
    selections: {},   // sectionSlug -> optionId
    customizations: [], // array of selected customization option IDs
    quantity: 100,
  };

  let data = {
    categories: [],
    sections: [],
    options: [],
    pricingRules: [],
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

  function getOptionsForSection(sectionId) {
    const section = data.sections.find((s) => s.id === sectionId);
    const opts = data.options.filter((o) => o.section_id === sectionId);

    if (section && section.depends_on_category && state.categoryId) {
      return opts.filter((o) => o.available_for_categories.includes(state.categoryId));
    }
    return opts;
  }

  function getColorsForMaterial(materialOptionId) {
    return data.colorPalettes.filter((c) => c.material_option_id === materialOptionId);
  }

  return { getState, update, subscribe, setData, getData, getOptionsForSection, getColorsForMaterial };
}
