import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signInWithEmail } from '../lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // const handleLogin = async () => {
  //   setLoading(true);
  //   await signInWithEmail(email, password);
  //   setLoading(false);
  // };

  const handleLogin = async () => {
    setLoading(true);
    const { success, error, session } = await signInWithEmail(email, password);
    setLoading(false);

    if (!success || !session) {
      Alert.alert("Login failed", error?.message ?? "Unknown error");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("has_onboarded")
      .eq("id", session.user.id)
      .maybeSingle();

    router.replace(profile?.has_onboarded ? "/(tabs)" : "/onboarding");
  };


  return (
    <View className="flex-1 bg-surface px-8 justify-center">
      <View className="mb-12">
        <View className="w-16 h-16 bg-primary rounded-2xl mb-6 items-center justify-center shadow-lg">
          <Text className="text-white text-3xl font-bold">S</Text>
        </View>
        <Text className="text-4xl font-bold text-accent">Sous Chef</Text>
        <Text className="text-lg text-accent/60">Your AI-powered kitchen companion.</Text>
      </View>

      <View className="space-y-4">
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          className="bg-white p-5 rounded-2xl border border-gray-200 text-accent text-lg shadow-sm"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-white p-5 rounded-2xl border border-gray-200 text-accent text-lg shadow-sm mt-4"
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary p-5 rounded-2xl shadow-md mt-6 flex-row justify-center"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-xl">Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/signup')} className="mt-6">
          <Text className="text-accent/50 text-center text-base">New here? <Text className="text-primary font-bold">Create Profile</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}