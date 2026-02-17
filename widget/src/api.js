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

export async function fetchPrintMethods() {
  const { data, error } = await getSupabase()
    .from('print_methods')
    .select('*')
    .order('sort_order');
  if (error) throw error;
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
  const { data, error } = await getSupabase()
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllData() {
  const [categories, fits, materials, productVariants, printMethods, quantityTiers, colorPalettes] =
    await Promise.all([
      fetchCategories(),
      fetchFits(),
      fetchMaterials(),
      fetchProductVariants(),
      fetchPrintMethods(),
      fetchQuantityTiers(),
      fetchColorPalettes(),
    ]);
  return { categories, fits, materials, productVariants, printMethods, quantityTiers, colorPalettes };
}
