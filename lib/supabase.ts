// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install'; // 2026 high-performance storage
import 'react-native-url-polyfill/auto';

// Read Supabase settings from environment variables. Prefer client-safe `EXPO_PUBLIC_*` var when
// running on the client (Expo/Next). Fall back to server vars when available.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {

  console.warn('Supabase environment variables not set: SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});