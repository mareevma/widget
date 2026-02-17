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

export async function fetchSections() {
  const { data, error } = await getSupabase()
    .from('sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchOptions() {
  const { data, error } = await getSupabase()
    .from('options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchPricingRules() {
  const { data, error } = await getSupabase()
    .from('pricing_rules')
    .select('*');
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
  const [categories, sections, options, pricingRules, colorPalettes] = await Promise.all([
    fetchCategories(),
    fetchSections(),
    fetchOptions(),
    fetchPricingRules(),
    fetchColorPalettes(),
  ]);
  return { categories, sections, options, pricingRules, colorPalettes };
}
