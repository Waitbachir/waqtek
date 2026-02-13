import { createClient } from "@supabase/supabase-js";

let supabaseInstance = null;

export function initSupabase() {
  if (!supabaseInstance && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabaseInstance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }
  return supabaseInstance;
}

export const supabase = initSupabase();
