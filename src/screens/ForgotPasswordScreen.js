import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../services/supabase';

function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function ForgotPasswordScreen() {
  const client = useMemo(() => supabase, []);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSend = async () => {
    setErrorMessage('');
    setStatusMessage('');
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Invalid email');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'cleexeapp',
        path: 'reset-password',
      });

      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatusMessage('Password reset email sent');
      router.push('/(auth)/reset-password');
    } catch (error) {
      setErrorMessage(error.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your account email to reset password.</Text>

      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {!!statusMessage && <Text style={styles.success}>{statusMessage}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Pressable disabled={loading} style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]} onPress={handleSend}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send Reset Email</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/sign-in')}>
        <Text style={styles.link}>Back to Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#111827',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 10,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#FCA5A5',
    marginBottom: 10,
  },
  success: {
    color: '#86EFAC',
    marginBottom: 10,
  },
  link: {
    color: '#C7D2FE',
    textAlign: 'center',
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
});
