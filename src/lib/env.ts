import { browser } from '$app/environment';

// Get environment variables with fallbacks
export const SUPABASE_URL = browser 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY = browser 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}
