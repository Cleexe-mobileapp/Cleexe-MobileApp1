// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEPRECATED — replaced by storage-cleanup (unified)
// This wrapper calls the unified function so existing cron schedules still work.
// Migrate your cron to: supabase functions schedule storage-cleanup --cron "0 */4 * * *"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
  console.log('[DEPRECATED] cleanup-intro-videos → delegating to cleanup_expired_files()');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.rpc('cleanup_expired_files');

    if (error) {
      console.error('cleanup_expired_files error:', error.message);
      return new Response(JSON.stringify({ error: error.message, deprecated: true }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ...data, deprecated: true, migrate_to: 'storage-cleanup' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
