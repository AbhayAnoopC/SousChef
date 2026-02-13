import Constants from "expo-constants";
import { Stack, useRouter, useSegments } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from "react-native-purchases";
import "../global.css";
import { supabase } from '../lib/supabase';

export const SignOutButton = () => {
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          // 1) Supabase sign out
          await supabase.auth.signOut();

          // 2) RevenueCat sign out (important)
          try {
            await Purchases.logOut();
          } catch (e) {
            console.log("RevenueCat logOut error", e);
          }

          // 3) Route to login
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <TouchableOpacity onPress={handleSignOut} className="mr-6 p-2 bg-slate-50 rounded-xl">
      <LogOut size={20} color="#64748B" />
    </TouchableOpacity>
  );
};

export async function getPackages() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.log("RevenueCat getOfferings error", e);
    return [];
  }
}
export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const purchasesConfigured = useRef(false);

  const extra =
    Constants.expoConfig?.extra ??
    (Constants as any).manifest?.extra ??
    (Constants as any).manifest2?.extra;

  const RC_KEY = extra?.revenuecatPublicKeyIOS;

  useEffect(() => {
    if (purchasesConfigured.current) return;

    if (!RC_KEY) {
      console.log("RC_KEY missing at runtime. extra =", extra);
      return;
    }
    console.log("RC_KEY length:", RC_KEY?.length);

    Purchases.configure({ apiKey: RC_KEY });
    purchasesConfigured.current = true;
    console.log("RevenueCat configured");
  }, []);

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes (Sign in / Sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      setSession(_session);
      setLoading(false);


    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    console.log('Auth check:', { session: !!session, segments });

    if (!session && inTabsGroup) {
      // Redirect to the sign-in page
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="recipe/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}