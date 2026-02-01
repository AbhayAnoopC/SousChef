// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install'; // 2026 high-performance storage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itsujrbmxjxzfcauztjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0c3VqcmJteGp4emZjYXV6dGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTY5MDQsImV4cCI6MjA4NTM5MjkwNH0.RHYJifmHOZcMHe5Lmdlb633uJgN01cluSUAaZ94xmPw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});