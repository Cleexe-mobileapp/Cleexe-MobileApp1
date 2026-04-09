import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import { useAuthSession } from '../context/AuthSessionProvider';
import { replaceWithMainTabs, replaceWithOnboarding } from '../lib/auth-routes';
import { supabase, checkOnboardingCompleted } from '../services/supabase';
import { extractSessionFromUrl } from '../lib/extract-oauth-session';

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.998 23.998 0 0 0 0 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

WebBrowser.maybeCompleteAuthSession();
const LOGO = require('../../assets/images/cleexe-logo-square.png');

function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function SignInScreen() {
  const { refreshOnboarding } = useAuthSession();
  const client = useMemo(() => supabase, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingType, setLoadingType] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isBusy = loadingType !== null;

  const handleSignIn = async () => {
    setErrorMessage('');
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Invalid email');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setLoadingType('email');
    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      await refreshOnboarding();
      const { data: { user: authUser } } = await client.auth.getUser();
      const done = await checkOnboardingCompleted(authUser?.id);
      if (done) await replaceWithMainTabs();
      else replaceWithOnboarding({ source: 'signin', email });
    } catch (error) {
      setErrorMessage(error.message || 'Authentication error');
    } finally {
      setLoadingType(null);
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMessage('');
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }
    setLoadingType('apple');
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) throw new Error('Apple Sign In is not available on this device.');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('Unable to verify Apple identity token.');

      const { error } = await client.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      });

      if (error) throw error;
      await refreshOnboarding();
      const { data: { user: appleUser } } = await client.auth.getUser();
      const done = await checkOnboardingCompleted(appleUser?.id);
      if (done) await replaceWithMainTabs();
      else replaceWithOnboarding({ source: 'signin_apple' });
    } catch (error) {
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      setErrorMessage(error.message || 'Authentication error');
    } finally {
      setLoadingType(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }
    setLoadingType('google');
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'cleexeapp',
        path: 'auth/callback',
      });

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Unable to open Google login.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;

      const { session, error: sessionError } = await extractSessionFromUrl(result.url);
      if (sessionError) throw sessionError;

      if (session) {
        await refreshOnboarding();
        const done = await checkOnboardingCompleted(session.user?.id);
        if (done) await replaceWithMainTabs();
        else replaceWithOnboarding({ source: 'signin_google' });
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication error');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Continue your journey</Text>
      </View>

      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </Pressable>

      <View style={styles.signInButtonPerspective}>
        <Pressable
          disabled={isBusy}
          style={({ pressed }) => [styles.signInButton, pressed && styles.signInPressed]}
          onPress={handleSignIn}
        >
          {loadingType === 'email' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInText}>Sign In</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.dividerWrap}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.socialGroup}>
        <Pressable
          disabled={isBusy}
          style={({ pressed }) => [styles.appleButton, pressed && styles.pressed]}
          onPress={handleAppleSignIn}
        >
          {loadingType === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.socialButtonContent}>
                <Ionicons name="logo-apple" size={22} color="#fff" style={styles.socialIconLeft} />
                <Text style={styles.appleText}>Continue with Apple</Text>
              </View>
          )}
        </Pressable>

        <Pressable
          disabled={isBusy}
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          onPress={handleGoogleSignIn}
        >
          {loadingType === 'google' ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <View style={styles.socialButtonContent}>
              <View style={styles.socialIconLeft}>
                <GoogleIcon size={22} />
              </View>
              <Text style={styles.googleText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Text style={styles.linkText}>
        Don&apos;t have an account?{' '}
        <Text style={styles.link} onPress={() => router.push('/(auth)/sign-up')}>
          Sign Up
        </Text>
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    backgroundColor: '#FFFFFF',
  },
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 15,
    marginBottom: 18,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    color: '#FCA5A5',
    marginBottom: 12,
    fontSize: 14,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  label: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'transparent',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
  },
  forgot: {
    color: '#4F46E5',
    marginBottom: 18,
    alignSelf: 'flex-end',
    fontWeight: '600',
    fontSize: 13,
  },
  signInButtonPerspective: {
    perspective: 1000,
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  signInPressed: {
    transform: [{ scale: 0.96 }, { rotateX: '10deg' }],
  },
  signInText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    marginHorizontal: 10,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  socialGroup: {
    marginBottom: 18,
    gap: 10,
  },
  socialButtonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  socialIconLeft: {
    position: 'absolute',
    left: 16,
  },
  appleButton: {
    backgroundColor: '#000',
    borderRadius: 999,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleText: { color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: { color: '#111827', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  linkText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
  },
  link: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
