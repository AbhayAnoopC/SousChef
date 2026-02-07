import "../global.css";
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // Changed Slot to Stack
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Subscribe ONCE to auth state changes. Previously this effect re-ran on every
    // navigation (because `segments` was a dependency), which caused the callback
    // to execute and *immediately* replace routes when you tried to navigate to
    // non-(tabs) pages (like `/test` or recipe modals). That is why the screen
    // briefly slid away then returned.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === '(tabs)';

      if (session && !inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!session && inAuthGroup) {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
    // Only run once at mount. Don't re-subscribe on navigation changes.
  }, []);

  // Using Stack instead of Slot allows for "push" navigation
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This represents your login screen */}
      <Stack.Screen name="index" /> 
      
      {/* This represents your main app tabs */}
      <Stack.Screen name="(tabs)" /> 
      
      {/* This defines how the recipe detail page should appear */}
      <Stack.Screen 
        name="recipe/[id]" 
        options={{ 
          presentation: 'modal', // Makes it slide up like a sheet
          animation: 'slide_from_bottom' 
        }} 
      />
    </Stack>
  );
}