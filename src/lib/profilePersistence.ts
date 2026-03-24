import { supabase } from '@/src/services/supabase';

/** PostgREST: table not exposed / missing from schema cache */
export function isMissingProfilesTableError(err: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!err) return false;
  if (err.code === 'PGRST205' || err.code === '42P01') return true;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('schema cache') && msg.includes('profiles')) return true;
  if (msg.includes('could not find the table') && msg.includes('profiles')) return true;
  if (msg.includes('relation') && msg.includes('profiles') && msg.includes('does not exist')) return true;
  return false;
}

async function mergeUserMetadata(patch: Record<string, unknown>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: { user: null }, error: { message: 'Not signed in' } as { message: string } };
  }
  const next = { ...(user.user_metadata as Record<string, unknown>), ...patch };
  return supabase.auth.updateUser({ data: next });
}

export type RemoteProfileFields = {
  username: string;
  bio: string;
  avatar_url: string | null;
  category: string | null;
};

/**
 * Persist profile edits: tries `public.profiles` first; if that table is missing, stores on auth metadata.
 */
export async function saveProfileEdits(params: {
  userId: string;
  username: string;
  bio: string;
  category: string;
  fullName: string;
}): Promise<{ ok: true; usedMetadataFallback: boolean } | { ok: false; message: string }> {
  const { userId, username, bio, category, fullName } = params;

  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      username,
      bio,
      category,
    })
    .eq('id', userId);

  if (!pErr) {
    const { error: aErr } = await mergeUserMetadata({ full_name: fullName });
    if (aErr) {
      console.warn('profile_save_auth_meta:', aErr.message);
    }
    return { ok: true, usedMetadataFallback: false };
  }

  if (isMissingProfilesTableError(pErr)) {
    const { error: aErr } = await mergeUserMetadata({
      full_name: fullName,
      username,
      bio,
      category,
    });
    if (aErr) {
      return { ok: false, message: aErr.message };
    }
    return { ok: true, usedMetadataFallback: true };
  }

  return { ok: false, message: pErr.message };
}

/** After avatar upload: write URL to profiles or metadata fallback */
export async function saveAvatarPublicUrl(
  userId: string,
  publicUrl: string
): Promise<{ ok: true; usedMetadataFallback: boolean } | { ok: false; message: string }> {
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (!dbErr) {
    // Keep JWT user_metadata in sync so reloads (getUser + profiles) don’t alternate URLs.
    const { error: syncErr } = await mergeUserMetadata({ avatar_url: publicUrl });
    if (syncErr) {
      console.warn('avatar_metadata_sync:', syncErr.message);
    }
    await supabase.auth.refreshSession().catch(() => {});
    return { ok: true, usedMetadataFallback: false };
  }

  if (isMissingProfilesTableError(dbErr)) {
    const { error: aErr } = await mergeUserMetadata({ avatar_url: publicUrl });
    if (aErr) {
      return { ok: false, message: aErr.message };
    }
    await supabase.auth.refreshSession().catch(() => {});
    return { ok: true, usedMetadataFallback: true };
  }

  return { ok: false, message: dbErr.message };
}

export async function saveCategoryRemote(
  userId: string,
  category: string
): Promise<{ ok: true; usedMetadataFallback: boolean } | { ok: false; message: string }> {
  const { error } = await supabase.from('profiles').update({ category }).eq('id', userId);

  if (!error) {
    return { ok: true, usedMetadataFallback: false };
  }

  if (isMissingProfilesTableError(error)) {
    const { error: aErr } = await mergeUserMetadata({ category });
    if (aErr) {
      return { ok: false, message: aErr.message };
    }
    return { ok: true, usedMetadataFallback: true };
  }

  return { ok: false, message: error.message };
}

type ProfileRowLike = {
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  category?: string | null;
};

/** Treat empty / whitespace as missing so we fall back to auth metadata (OAuth avatars, etc.). */
function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Single stable avatar URL: prefer `profiles.avatar_url`, then app `avatar_url` in metadata,
 * then `picture` (Google / Apple OAuth). Avoids flicker when DB has "" or JWT has a different key.
 */
export function pickMergedAvatarUrl(
  row: ProfileRowLike | null,
  meta: Record<string, string | undefined> | undefined
): string | null {
  const fromRow = nonEmptyString(row?.avatar_url);
  if (fromRow) return fromRow;
  const fromMetaUrl = nonEmptyString(meta?.avatar_url);
  if (fromMetaUrl) return fromMetaUrl;
  const picture = (meta as Record<string, unknown> | undefined)?.picture;
  return nonEmptyString(picture);
}

/** Prefer `profiles` row; fill gaps from auth user_metadata (e.g. metadata fallback saves). */
export function mergeProfileWithMetadata(
  row: ProfileRowLike | null,
  meta: Record<string, string | undefined> | undefined
): RemoteProfileFields {
  return {
    username: row?.username ?? meta?.username ?? meta?.preferred_username ?? '',
    bio: row?.bio ?? meta?.bio ?? '',
    avatar_url: pickMergedAvatarUrl(row, meta),
    category: row?.category ?? meta?.category ?? null,
  };
}
