/**
 * Email OTP signup — Supabase-compatible handlers.
 *
 * Important: `signInWithOtp` does NOT accept `password` in @supabase/supabase-js.
 * - Email + password: use `signUp({ email, password })`, then `verifyOtp({ type: 'signup' })`.
 * - Passwordless: use `signInWithOtp({ email, options: { shouldCreateUser: true } })`,
 *   then `verifyOtp({ type: 'email' })`.
 *
 * If emails never arrive, check Supabase (not only this file):
 * 1) Authentication → Providers → Email: provider ON.
 * 2) "Confirm email" (email confirmations) must be ON for signUp to send a code/link;
 *    if disabled, signUp returns a session immediately and no email is sent.
 * 3) For passwordless OTP: enable Email OTP / 6-digit code (wording varies by project version).
 * 4) Authentication → URL Configuration → Redirect URLs: add the exact redirect used below
 *    (e.g. cleexeapp://auth/callback) and your Expo dev URL if you use Expo Go.
 * 5) Optional SMTP: Auth → SMTP; otherwise built-in mail has rate limits.
 * 6) Auth logs (Dashboard) for delivery errors; spam folder.
 */

import { makeRedirectUri } from 'expo-auth-session';

export function getAuthEmailRedirectUri() {
  const fromEnv = process.env.EXPO_PUBLIC_SUPABASE_EMAIL_REDIRECT?.trim();
  if (fromEnv) return fromEnv;
  return makeRedirectUri({
    scheme: 'cleexeapp',
    path: 'auth/callback',
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ email: string; password: string; confirmPassword: string }} fields
 * @returns {Promise<{ ok: true; next: 'verify_otp'|'onboarding'; email: string; otpType?: 'signup'|'email' } | { ok: false; error: Error }>}
 */
export async function handleSignUp(client, { email, password, confirmPassword }) {
  const e = email.trim();
  if (!e) {
    return { ok: false, error: new Error('Email is required') };
  }

  const passwordless = !password.trim() && !confirmPassword.trim();

  if (!passwordless) {
    if (!password || password.length < 6) {
      return { ok: false, error: new Error('Password must be at least 6 characters.') };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: new Error('Password mismatch') };
    }

    const emailRedirectTo = getAuthEmailRedirectUri();

    const { data, error } = await client.auth.signUp({
      email: e,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) return { ok: false, error };
    if (data.session) {
      return { ok: true, next: 'onboarding', email: e };
    }
    return { ok: true, next: 'verify_otp', email: e, otpType: 'signup' };
  }

  const emailRedirectTo = getAuthEmailRedirectUri();

  const { error } = await client.auth.signInWithOtp({
    email: e,
    options: {
      shouldCreateUser: true,
      emailRedirectTo,
    },
  });

  if (error) return { ok: false, error };
  return { ok: true, next: 'verify_otp', email: e, otpType: 'email' };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ email: string; token: string; type: 'signup' | 'email' }} args
 */
export async function handleVerifyOtp(client, { email, token, type }) {
  const clean = String(token).replace(/\D/g, '');
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: clean,
    type,
  });
  if (error) return { ok: false, error };
  return { ok: true, data };
}
