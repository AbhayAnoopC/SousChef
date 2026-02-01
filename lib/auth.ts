import { Alert } from 'react-native';
import { supabase } from './supabase';

/**
 * Signs in a user with email and password.
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Alert.alert("Login Error", error.message);
    return { success: false, error };
  }
  return { success: true };
};

/**
 * Signs up a new user and sends a confirmation email.
 */
export const signUpWithEmail = async (email: string, password: string) => {
  const { data: { session }, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    Alert.alert("Sign Up Error", error.message);
    return { success: false, error };
  } 
  
  if (!session) {
    Alert.alert("Check your inbox!", "We've sent a verification link to your email.");
  }
  
  return { success: true, session };
};