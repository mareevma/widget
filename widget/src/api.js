import { getSupabase } from './supabase.js';

export async function fetchCategories() {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchFits() {
  const { data, error } = await getSupabase()
    .from('fits')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchMaterials() {
  const { data, error } = await getSupabase()
    .from('materials')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchProductVariants() {
  const { data, error } = await getSupabase()
    .from('product_variants')
    .select('*');
  if (error) throw error;
  return data;
}

export async function fetchCategoryFits() {
  const { data, error } = await getSupabase()
    .from('category_fits')
    .select('*');
  if (error) throw error;
  return data;
}

export async function fetchCategoryMaterials() {
  const { data, error } = await getSupabase()
    .from('category_materials')
    .select('*');
  if (error) throw error;
  return data;
}

export async function fetchPrintMethods() {
  const { data, error } = await getSupabase()
    .from('print_methods')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchCategoryPrintMethods() {
  const { data, error } = await getSupabase()
    .from('category_print_methods')
    .select('*');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function fetchCustomizations() {
  const { data, error } = await getSupabase()
    .from('customizations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function fetchCategoryCustomizations() {
  const { data, error } = await getSupabase()
    .from('category_customizations')
    .select('*');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function fetchCategoryCustomizationPrices() {
  const { data, error } = await getSupabase()
    .from('category_customization_prices')
    .select('*');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data;
}

export async function fetchQuantityTiers() {
  const { data, error } = await getSupabase()
    .from('quantity_tiers')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchColorPalettes() {
  const { data, error } = await getSupabase()
    .from('color_palettes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function submitOrder(order) {
  const { error } = await getSupabase()
    .from('orders')
    .insert(order);
  if (error) throw error;
  return { ok: true };
}

export async function fetchAllData() {
  const [
    categories,
    fits,
    materials,
    productVariants,
    categoryFits,
    categoryMaterials,
    printMethods,
    categoryPrintMethods,
    customizations,
    categoryCustomizations,
    categoryCustomizationPrices,
    quantityTiers,
    colorPalettes,
  ] =
    await Promise.all([
      fetchCategories(),
      fetchFits(),
      fetchMaterials(),
      fetchProductVariants(),
      fetchCategoryFits(),
      fetchCategoryMaterials(),
      fetchPrintMethods(),
      fetchCategoryPrintMethods(),
      fetchCustomizations(),
      fetchCategoryCustomizations(),
      fetchCategoryCustomizationPrices(),
      fetchQuantityTiers(),
      fetchColorPalettes(),
    ]);
  return {
    categories,
    fits,
    materials,
    productVariants,
    categoryFits,
    categoryMaterials,
    printMethods,
    categoryPrintMethods,
    customizations,
    categoryCustomizations,
    categoryCustomizationPrices,
    quantityTiers,
    colorPalettes,
  };
}
