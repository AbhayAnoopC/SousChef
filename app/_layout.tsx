import "../global.css";
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // Changed Slot to Stack
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === '(tabs)';

      if (session && !inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!session && inAuthGroup) {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [segments]);

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