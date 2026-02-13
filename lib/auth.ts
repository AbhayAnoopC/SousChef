import { Alert } from 'react-native';
import { supabase } from './supabase';

/**
 * Signs in a user with email and password.
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Alert.alert("Login Error", error.message);
    return { success: false, error };
  }
  return { success: !!data.session && !error, error, session: data.session };
};

/**
 * Signs up a new user and sends a confirmation email.
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  // Note: data.session can be null if email confirmation is required
  return { success: !error, error, session: data.session };
}
