import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuthSession } from '../context/AuthSessionProvider';
import { handleVerifyOtp } from '../lib/auth-email-otp';
import { replaceWithOnboarding } from '../lib/auth-routes';
import { supabase } from '../services/supabase';

const OTP_LEN = 6;

function normalizeEmail(raw) {
  if (!raw) return '';
  return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw);
}

function normalizeOtpType(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'email' ? 'email' : 'signup';
}

export default function VerifyOtpScreen() {
  const { refreshOnboarding } = useAuthSession();
  const params = useLocalSearchParams();
  const email = useMemo(() => normalizeEmail(params.email).trim(), [params.email]);
  const otpType = useMemo(() => normalizeOtpType(params.otpType), [params.otpType]);

  const client = useMemo(() => supabase, []);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const verifyType = otpType === 'email' ? 'email' : 'signup';

  const submit = useCallback(async () => {
    setErrorMessage('');
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }
    if (!email) {
      setErrorMessage('Missing email. Go back and sign up again.');
      return;
    }
    const token = code.replace(/\D/g, '').slice(0, OTP_LEN);
    if (token.length !== OTP_LEN) {
      setErrorMessage(`Enter the ${OTP_LEN}-digit code from your email.`);
      return;
    }

    setLoading(true);
    try {
      const result = await handleVerifyOtp(client, {
        email,
        token,
        type: verifyType,
      });
      if (!result.ok) {
        setErrorMessage(result.error.message || 'Invalid or expired code.');
        return;
      }
      await refreshOnboarding();
      replaceWithOnboarding({ source: 'signup_otp', email });
    } catch (e) {
      setErrorMessage(e.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }, [client, code, email, refreshOnboarding, verifyType]);

  const resend = useCallback(async () => {
    setErrorMessage('');
    if (!client || !email) return;
    setResending(true);
    try {
      if (otpType === 'email') {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      } else {
        const { error } = await client.auth.resend({
          type: 'signup',
          email,
        });
        if (error) throw error;
      }
      setErrorMessage('');
    } catch (e) {
      setErrorMessage(e.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  }, [client, email, otpType]);

  if (!email) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#4F46E5" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.missing}>Something went wrong. Return to sign up and try again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#4F46E5" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a {OTP_LEN}-digit code to{' '}
          <Text style={styles.emailEm}>{email}</Text>
        </Text>

        {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Text style={styles.label}>Verification code</Text>
        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, OTP_LEN))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={OTP_LEN}
          placeholder="••••••"
          placeholderTextColor="#D1D5DB"
          onSubmitEditing={submit}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify & continue</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.resendWrap}
          onPress={resend}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <Text style={styles.resendText}>Didn&apos;t get it? Resend code</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  backText: { color: '#4F46E5', fontSize: 16, fontWeight: '600' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  emailEm: { fontWeight: '600', color: '#374151' },
  error: { color: '#DC2626', marginBottom: 12, fontSize: 14 },
  missing: { padding: 24, fontSize: 15, color: '#6B7280' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#111827',
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.92 },
  resendWrap: { marginTop: 20, alignItems: 'center', minHeight: 24 },
  resendText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
});
