import { createClient } from '@supabase/supabase-js';

let client = null;

export function initSupabase(url, anonKey) {
  client = createClient(url, anonKey);
  return client;
}

export function getSupabase() {
  if (!client) throw new Error('Supabase not initialized. Call initSupabase() first.');
  return client;
}
