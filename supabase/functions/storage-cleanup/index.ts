// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cleexe Edge Function: storage-cleanup (UNIFIED)
// Replaces: cleanup-ask-questions, cleanup-intro-videos
//
// Runs every 4 hours via cron. Handles ALL temporary file expiry in one pass:
//   1. Reads tracked_files where expires_at < now()
//   2. Deletes objects from Supabase Storage (cleexe-temporary bucket)
//   3. Deletes tracking rows (triggers storage_used_bytes decrement)
//   4. Cleans ask_questions with expired files
//   5. Clears expired video intros from profiles
//
// Deploy:   supabase functions deploy storage-cleanup
// Schedule: supabase functions schedule storage-cleanup --cron "0 */4 * * *"
// Manual:   curl -X POST <function-url> -H "Authorization: Bearer <svc-key>"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TrackedFile {
  id: string;
  user_id: string;
  bucket: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
}

Deno.serve(async () => {
  const started = Date.now();
  const results = {
    expired_files_deleted: 0,
    storage_objects_removed: 0,
    ask_questions_cleaned: 0,
    video_intros_cleared: 0,
    errors: [] as string[],
    duration_ms: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // ── Step 1: Fetch all expired tracked files ─────────────────────────────
    const { data: expiredFiles, error: fetchErr } = await supabase
      .from('tracked_files')
      .select('id, user_id, bucket, file_path, file_type, size_bytes')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .limit(500); // batch to avoid timeout

    if (fetchErr) {
      results.errors.push(`tracked_files fetch: ${fetchErr.message}`);
    }

    // ── Step 2: Delete storage objects by bucket ────────────────────────────
    if (expiredFiles && expiredFiles.length > 0) {
      const byBucket: Record<string, TrackedFile[]> = {};
      for (const f of expiredFiles) {
        if (!byBucket[f.bucket]) byBucket[f.bucket] = [];
        byBucket[f.bucket].push(f);
      }

      for (const [bucket, files] of Object.entries(byBucket)) {
        const paths = files.map((f) => f.file_path);

        const { error: rmErr } = await supabase.storage
          .from(bucket)
          .remove(paths);

        if (rmErr) {
          results.errors.push(`storage.remove(${bucket}): ${rmErr.message}`);
        } else {
          results.storage_objects_removed += paths.length;
          console.log(`Removed ${paths.length} objects from ${bucket}`);
        }
      }

      // ── Step 3: Delete tracking rows (triggers storage_used_bytes decrement)
      const ids = expiredFiles.map((f) => f.id);

      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error: delErr } = await supabase
          .from('tracked_files')
          .delete()
          .in('id', chunk);

        if (delErr) {
          results.errors.push(`tracked_files delete chunk ${i}: ${delErr.message}`);
        } else {
          results.expired_files_deleted += chunk.length;
        }
      }
    }

    // ── Step 4: Clean expired ask_questions ──────────────────────────────────
    // Delete associated storage objects first
    const { data: expiredQuestions } = await supabase
      .from('ask_questions')
      .select('id, video_url, file_path')
      .lt('expires_at', now)
      .not('expires_at', 'is', null);

    if (expiredQuestions && expiredQuestions.length > 0) {
      const videoPaths = expiredQuestions
        .map((q) => {
          const url = q.file_path || q.video_url;
          if (!url) return null;
          const match = url.match(/cleexe-temporary\/(.+)/);
          if (match) return match[1];
          const legacyMatch = url.match(/ask-videos\/(.+)/);
          return legacyMatch ? legacyMatch[1] : null;
        })
        .filter(Boolean) as string[];

      if (videoPaths.length > 0) {
        await supabase.storage.from('cleexe-temporary').remove(videoPaths);
        // Also try legacy bucket
        await supabase.storage.from('ask-videos').remove(videoPaths);
      }

      const { count } = await supabase
        .from('ask_questions')
        .delete({ count: 'exact' })
        .lt('expires_at', now)
        .not('expires_at', 'is', null);

      results.ask_questions_cleaned = count || 0;
    }

    // Legacy: also clean ask_questions by created_at (for rows without expires_at)
    const legacyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: legacyExpired } = await supabase
      .from('ask_questions')
      .select('id, video_url')
      .lt('created_at', legacyCutoff)
      .is('expires_at', null);

    if (legacyExpired && legacyExpired.length > 0) {
      const legacyPaths = legacyExpired
        .map((q) => {
          if (!q.video_url) return null;
          const m = q.video_url.match(/ask-videos\/(.+)/);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[];

      if (legacyPaths.length > 0) {
        await supabase.storage.from('ask-videos').remove(legacyPaths);
      }

      const { count: legacyCount } = await supabase
        .from('ask_questions')
        .delete({ count: 'exact' })
        .lt('created_at', legacyCutoff)
        .is('expires_at', null);

      results.ask_questions_cleaned += legacyCount || 0;
    }

    // ── Step 5: Clear expired video intros from profiles ────────────────────
    const videoCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredIntros } = await supabase
      .from('profiles')
      .select('id, video_intro_url')
      .lt('video_intro_at', videoCutoff)
      .not('video_intro_url', 'is', null);

    if (expiredIntros && expiredIntros.length > 0) {
      const introPaths = expiredIntros
        .map((p) => {
          if (!p.video_intro_url) return null;
          const m = p.video_intro_url.match(/(video-intros|cleexe-temporary)\/(.+)/);
          return m ? m[2] : null;
        })
        .filter(Boolean) as string[];

      if (introPaths.length > 0) {
        await supabase.storage.from('cleexe-temporary').remove(introPaths);
        await supabase.storage.from('video-intros').remove(introPaths);
      }

      const introIds = expiredIntros.map((p) => p.id);
      await supabase
        .from('profiles')
        .update({ video_intro_url: null, video_intro_at: null })
        .in('id', introIds);

      results.video_intros_cleared = introIds.length;
    }

    results.duration_ms = Date.now() - started;
    console.log('Storage cleanup complete:', JSON.stringify(results));

    return new Response(JSON.stringify(results), {
      status: results.errors.length > 0 ? 207 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    results.errors.push(String(err));
    results.duration_ms = Date.now() - started;
    console.error('Storage cleanup fatal error:', err);

    return new Response(JSON.stringify(results), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
