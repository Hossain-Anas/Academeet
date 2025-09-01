import { createClient } from '@supabase/supabase-js'
import { browser } from '$app/environment'

// Type assertion for Vite environment variables
const supabaseUrl = (import.meta as any).env.PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY as string

// Debug logging to see what's happening
console.log('Environment check:', {
  url: supabaseUrl ? 'Present' : 'Missing',
  key: supabaseAnonKey ? 'Present' : 'Missing'
})

// Make sure to set these environment variables in your .env.local file
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Create Supabase client with environment-aware configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: browser, // Only persist session on client-side
    storageKey: 'supabase.auth.token',
    storage: browser ? window.localStorage : undefined,
    autoRefreshToken: browser,
    detectSessionInUrl: browser
  },
  db: {
    schema: 'public'
  }
})

// Log database connection status
if (browser) {
  // Test database connection
  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .limit(1)
        .single();

      console.log('Database connection test:', {
        success: !error,
        error: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : null,
        tableExists: !!data
      });
    } catch (error: unknown) {
      console.error('Database connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Run the test after a short delay to ensure auth is initialized
  setTimeout(testConnection, 1000);
}