import { supabase } from '../services/supabase';

/**
 * After WebBrowser.openAuthSessionAsync resolves with type "success",
 * the callback URL contains the auth tokens that must be exchanged
 * before the Supabase session is usable.
 *
 * Handles both flows:
 *   • PKCE  → `?code=...`   → exchangeCodeForSession()
 *   • Implicit → `#access_token=...&refresh_token=...` → setSession()
 *
 * Returns `{ session, error }`.
 */
export async function extractSessionFromUrl(url) {
  if (!url) {
    return { session: null, error: new Error('No callback URL received.') };
  }

  try {
    // --- PKCE flow: authorization code in query params ---
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { session: null, error };
      return { session: data.session, error: null };
    }

    // --- Implicit flow: tokens in the URL hash fragment ---
    const hash = url.split('#')[1];
    if (hash) {
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) return { session: null, error };
        return { session: data.session, error: null };
      }
    }

    // --- Fallback: maybe the client picked it up automatically ---
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session ?? null, error };
  } catch (err) {
    return { session: null, error: err };
  }
}
