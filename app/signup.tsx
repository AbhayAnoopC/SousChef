import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '../lib/auth';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert("Missing Fields", "Please fill in all details to create your chef profile.");
      return;
    }

    setLoading(true);
    // Note: We'll pass fullName in the metadata so our Supabase trigger catches it
    const { success } = await signUpWithEmail(email, password);
    setLoading(false);

    if (success) {
      router.back(); // Go back to login after successful signup
    }
  };

  return (
    <View className="flex-1 bg-surface px-8 justify-center">
      <Text className="text-4xl font-bold text-accent mb-2">Join the Kitchen</Text>
      <Text className="text-lg text-accent/60 mb-10">Create an account to start cooking.</Text>

      <View className="space-y-4">
        <TextInput 
          placeholder="Full Name" 
          value={fullName}
          onChangeText={setFullName}
          className="bg-white p-5 rounded-2xl border border-gray-200 text-accent text-lg shadow-sm"
        />
        <TextInput 
          placeholder="Email Address" 
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          className="bg-white p-5 rounded-2xl border border-gray-200 text-accent text-lg shadow-sm mt-4"
        />
        <TextInput 
          placeholder="Password" 
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-white p-5 rounded-2xl border border-gray-200 text-accent text-lg shadow-sm mt-4"
        />

        <TouchableOpacity 
          onPress={handleSignUp}
          disabled={loading}
          className="bg-primary p-5 rounded-2xl shadow-md mt-6 flex-row justify-center"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-xl">Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="mt-6">
          <Text className="text-accent/50 text-center text-base">Already have an account? <Text className="text-primary font-bold">Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}